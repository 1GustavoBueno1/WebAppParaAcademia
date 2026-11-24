import { collection, getDocs, type Firestore } from 'firebase/firestore'
import type { ExerciseState, Plan } from '../domain/types.ts'
import { parseExerciseState, parsePlan } from '../domain/workoutDoc.ts'
import { firestoreErrorMessage } from './firestoreErrors.ts'






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

export async function loadPlans(db: Firestore, uid: string): Promise<LoadResult<Map<string, Plan>>> {
    try {
        const refs = collection(db, 'users', uid, 'plans')
        const snap = await getDocs(refs)
        const plans = new Map<string, Plan>()
        for (const d of snap.docs) {
            const parsed = parsePlan(d.data())
            if (parsed === null) continue
            plans.set(d.id, parsed)
    } 
    return {ok: true, data: plans}
    } catch (err) {
        return {ok: false, message: firestoreErrorMessage(err, 'Não foi possível carregar seus dados.')}
    }
}

export async function loadTemplates(db: Firestore): Promise<LoadResult<Map<string, Plan>>> {
    try {
        const ref = collection(db, 'templates')
        const snap = await getDocs(ref)
        const templates = new Map<string, Plan>()
        for (const d of snap.docs) {
            const parsed = parsePlan(d.data())
            if (parsed === null) continue
            templates.set(d.id, parsed)
    } 
    return {ok: true, data: templates}
    } catch (err) {
        return {ok: false, message: firestoreErrorMessage(err, 'Não foi possível carregar seus modelos de treino.')}
    }
}