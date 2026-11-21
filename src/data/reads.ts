import { collection, getDocs, type Firestore } from 'firebase/firestore'
import type { ExerciseState } from '../domain/types.ts'
import { parseExerciseState } from '../domain/workoutDoc.ts'
import { firestoreErrorMessage } from './firestoreErrors.ts'
import { stat } from 'node:fs'

export type LoadResult<T> = { ok: true; data: T } | { ok: false; message: string }




export async function loadExerciseStates(db: Firestore, uid: string): Promise<LoadResult<Map<string, ExerciseState>>>{
    try {
    const ref = collection(db, 'users', uid, 'exerciseState')
    const snap = await getDocs(ref)
    const states = new Map<string, ExerciseState>()
    for (const d of snap.docs) {
        const parsed = parseExerciseState(d.data())
        if (parsed === null) continue
        states.set(d.id, parsed)
    }   return {ok: true, data: states}
    } catch(err) {
        return {ok: false, message: firestoreErrorMessage(err, 'Não foi possível carregar seus dados.')}
    }
}