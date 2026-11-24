import { type Firestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { firestoreErrorMessage } from './firestoreErrors.ts'
import { isNonEmptyString } from "../domain/validation.ts";
import { type SaveResult } from '../domain/types.ts'

export async function ensureUserDoc(db: Firestore, uid: string, displayName: string | null): Promise<SaveResult> {
    try {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (snap.exists()) return { ok: true, id: uid }
    if (!isNonEmptyString(displayName, 50) || displayName.length < 2) return { ok: false, message: "display name muito curto ou muito longo"}
    const name = displayName.trim()
    await setDoc(ref, { displayName: name, createdAt: serverTimestamp() })
    return { ok: true, id: uid }}
    catch (err) { return {ok: false, message: firestoreErrorMessage(err)}
    }
}


