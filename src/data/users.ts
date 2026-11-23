import { Firestore, doc } from "firebase/firestore"


export type SaveResult = { ok: true; id: string } | { ok: false; message: string }

export async function ensureUserDoc(db: Firestore, uid: string, displayName: string): Promise<SaveResult> {
    if (displayName.length < 2 || displayName.length > 50) return { ok: false, message: "display name muito curto ou muito longo"}
    const snap = doc(db, 'users', uid)

}


