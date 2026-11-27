import { type Firestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { firestoreErrorMessage } from './firestoreErrors.ts'
import { isNonEmptyString } from "../domain/validation.ts";
import { type SaveResult } from '../domain/types.ts'

const NAME_MIN = 2
const NAME_MAX = 50

export async function ensureUserDoc(db: Firestore, uid: string, displayName: string | null): Promise<SaveResult> {
    try {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (snap.exists()) return { ok: true, id: uid }
    // Mede depois do trim, igual às rules: " a " tem 1 caractere.
    const name = (displayName ?? '').trim()
    if (!isNonEmptyString(name, NAME_MAX) || name.length < NAME_MIN) {
        return { ok: false, message: `O nome precisa ter de ${NAME_MIN} a ${NAME_MAX} caracteres.` }
    }
    await setDoc(ref, { displayName: name, createdAt: serverTimestamp() })
    return { ok: true, id: uid }}
    catch (err) { return {ok: false, message: firestoreErrorMessage(err)}
    }
}


