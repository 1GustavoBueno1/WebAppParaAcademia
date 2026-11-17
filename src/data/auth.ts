import { auth, db } from "../firebase-config";
import {doc, setDoc, serverTimestamp} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,     
  signOut as fbSignOut,                        
  onAuthStateChanged,
  type Unsubscribe,
  type User,             
} from 'firebase/auth'

const MAX_NAME_CARCTERES = 50
const MIN_NAME_CARCTERES = 2

export async function signUp(email: string, password: string, displayName: string) {
    const name = displayName.trim()
    if (name.length > MAX_NAME_CARCTERES || name.length < MIN_NAME_CARCTERES) {
       throw FirebaseError
    }
    const credenciais = await createUserWithEmailAndPassword(auth, email.trim(), password)
    await setDoc(doc(db, 'users', credenciais.user.uid), {
    displayName: name,
    createdAt: serverTimestamp(),
    })

}

export async function signIn(email: string, password: string): Promise<{ uid: string } | FirebaseError[]> {
    try {
        const credenciais = await signInWithEmailAndPassword(auth, email.trim(), password)
        return {uid: credenciais.user.uid}
    } catch (err) {
        if (err instanceof FirebaseError) return [err]
        throw err
    }
}

export async function signOut(): Promise<FirebaseError[]> {
    try {
        await fbSignOut(auth)
        return []
    } catch (err) {
        if (err instanceof FirebaseError) return [err]
        throw err
    }
}
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback)
}