import { collection, doc, runTransaction, type Firestore } from 'firebase/firestore'
import { validateWorkout } from '../domain/validation.ts'
import { suggestNext } from '../domain/progression.ts'
import type { PlanExercise, Workout } from '../domain/types.ts'
import { buildWorkoutDoc, cleanSets, readLastDate } from '../domain/workoutDoc.ts'
import { firestoreErrorMessage } from './firestoreErrors.ts'
import { type SaveResult } from '../domain/types.ts'

export async function saveWorkout(db: Firestore  ,uid: string, workout: Workout, planExercises: PlanExercise[]): Promise<SaveResult> {
    const [error] = validateWorkout(workout)
    if (error !== undefined) return { ok: false, message: error }

    const workoutRef = doc(collection(db, 'users', uid, 'workouts'))
    const stateRefs = workout.exercises.map(ex =>
        doc(db, 'users', uid, 'exerciseState', ex.exerciseId),
    )
    const workoutDoc = buildWorkoutDoc(workout)

    try {
        await runTransaction(db, async (tx) => {
            const snaps = await Promise.all(stateRefs.map(ref => tx.get(ref)))

            for (const [i, ex] of workout.exercises.entries()) {
                const snap = snaps[i]
                const stateRef = stateRefs[i]
                if (snap === undefined || stateRef === undefined) {
                    throw new Error('snaps e stateRefs fora de sincronia')
                }

                const planEx = planExercises.find(p => p.exerciseId === ex.exerciseId)
                if (planEx === undefined) continue 

                const lastDate = readLastDate(snap.data())
                if (lastDate !== null && lastDate > workout.date) continue 

                const sets = cleanSets(ex.sets)
                const s = suggestNext(planEx, sets)
                tx.set(stateRef, {
                    lastDate: workout.date,
                    lastSets: sets,
                    suggestedLoadKg: s.loadKg,
                    suggestedReps: s.reps,
                })
            }
            tx.set(workoutRef, workoutDoc)
        })
        return { ok: true, id: workoutRef.id }
    } catch (err) {
        return { ok: false, message: firestoreErrorMessage(err) }
    }
}