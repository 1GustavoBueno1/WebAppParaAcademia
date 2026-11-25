import { doc, setDoc, type Firestore } from "firebase/firestore";
import type { Plan } from "../domain/types.ts";
import type { SaveResult } from "../domain/types.ts";
import { isNonEmptyString, validatePlan  } from "../domain/validation.ts";
import { firestoreErrorMessage } from "./firestoreErrors.ts";

export async function createPlanFromTemplate(db: Firestore, uid: string, templateId: string, template: Plan): Promise<SaveResult> {
    const erros = validatePlan(template)
    if (erros.length > 0) return { ok: false, message: erros[0] ?? 'Plano inválido.' }
    if (!isNonEmptyString(templateId, 100) || templateId.includes('/')) return {ok: false, message: "Modelo de treino inválido."}
    const plano: Plan = {name: template.name, days: template.days, templateId}
    try {
        const ref = doc(db, 'users', uid, 'plans', templateId)
        await setDoc(ref, plano)
        return {ok: true, id: templateId}
    } catch(err) {
        return {ok: false, message: firestoreErrorMessage(err)}
    }
}