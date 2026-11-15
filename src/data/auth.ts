import { auth, db } from "../firebase-config";
import {doc, setDoc, serverTimestamp} from 'firebase/firestore'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,     
  signOut,                        
  onAuthStateChanged,             
} from 'firebase/auth'

const MAX_NAME_CARCTERES = 50
const MIN_NAME_CARCTERES = 8

export async function signUp(email: string, password: string, displayName: string) {

    if (displayName.trim().length >= MAX_NAME_CARCTERES || displayName.trim().length <= MIN_NAME_CARCTERES) {
        throw new Error("Nome deve contter no maximo 50 carcteres e no minimo 8.");
    }
    const credenciais = await createUserWithEmailAndPassword(auth, email.trim(), password.trim())
    await setDoc(doc(db, 'users', credenciais.user.uid), {
    displayName,
    createdAt: serverTimestamp(),
    })

}