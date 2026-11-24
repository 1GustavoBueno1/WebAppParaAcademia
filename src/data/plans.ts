import { doc, setDoc, type Firestore } from "firebase/firestore";
import type { Plan } from "../domain/types";
import type { SaveResult } from "../domain/types";
import { isNonEmptyString, validatePlan  } from "../domain/validation";
import { firestoreErrorMessage } from "./firestoreErrors";

export async function createPlanFromTemplate(db: Firestore, uid: string, templateId: string, template: Plan): Promise<SaveResult> {
    const erros = validatePlan(template)
    if (erros.length > 0) return { ok: false, message: erros[0] ?? 'Plano inválido.' }
    if (!isNonEmptyString(templateId, 100)) return {ok: false, message: "TemplateId invalido"}
    const plano: Plan = {name: template.name, days: template.days, templateId}
    try {
        const ref = doc(db, 'users', uid, 'plans', templateId)
        await setDoc(ref, plano)
        return {ok: true, id: templateId}
    } catch(err) {
        return {ok: false, message: firestoreErrorMessage(err)}
    }
}