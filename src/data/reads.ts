import { collection, getDocs, type Firestore } from 'firebase/firestore'
import {type }




export async function loadExerciseStates(db: Firestore, uid: string) {
    const ref = collection(db, 'users', uid, 'exerciseState')
    const snap = await getDocs(ref)
    for (const d in snap.docs) {

        const parsed = parseExercise

    }
}