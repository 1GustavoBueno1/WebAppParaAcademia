import type { Plan } from "./types.ts"

const LIMIT_REPMAX = 100
const LIMIT_REPMIN = 0

const TARGET_RIRMAX = 5
const TARGET_RIRMIN = 0

const TARGET_SETSMIN = 0
const TARGET_SETSMAX = 20

const LIMIT_NOTES = 200

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;


export function validatePlan(plan: unknown): string[] {
    if (typeof plan !== 'object' || plan === null) {
        return ["plano invalido"]
    }
    const typedPlan = plan as Plan;
    if (!Array.isArray(typedPlan.days) || typeof typedPlan.name !== "string" || typedPlan.name.trim().length === 0) {
        return ["Erro ao importar plano"]
    }
    if (typedPlan.days.length === 0) {
        return ["O plano precisa ter pelo menos um dia"]}
    const dayIds = new Set<string>()
    for (const day of typedPlan.days) {
        if (typeof day !== 'object' || day === null) {
        return ["plano invalido"]
    }
        if (typeof day.id !== "string" || day.id.trim().length <= 0 ||!Array.isArray(day.exercises)) {
            return ["plano invalido"]
        }
        if (dayIds.has(day.id)) {
            return [`Dia repetido: "${day.id}"`]
        }
        dayIds.add(day.id);
        if (typeof day.name !== 'string' ||  day.name.trim().length <= 0) {
            return ["Plano invalido"]
        }
        if (day.exercises.length === 0) {
            return [`O dia "${day.id}" não tem exercícios`]
        }
        const exerciseIds = new Set<string>();
            for (const ex of day.exercises) {
            if (typeof ex !== 'object' || ex === null) {
            return ["Exercício invalido"]
        }
            if (typeof ex.exerciseId !== "string" || ex.exerciseId.trim().length <= 0 ) {
                return ["Id de plano invalido"]
            }
            if (exerciseIds.has(ex.exerciseId)) {
                return [`Exercício repetido no dia "${day.id}": "${ex.exerciseId}"`]
            }
            exerciseIds.add(ex.exerciseId);
            if (typeof ex.name !== 'string' ||  ex.name.trim().length <= 0) {
                return ["nome invalido"]
            }
            if (ex.notes !== undefined && (typeof ex.notes !== 'string' || ex.notes.length > LIMIT_NOTES)) {
                return ["Notas invalidas"]
            }
            if ( ex.unit !== undefined && ex.unit !== 'reps' && ex.unit !== "seconds") {
                return ["Unidade de medida errado"]
            }
            if (!Number.isInteger(ex.repMax) || !Number.isInteger(ex.repMin) || !Number.isInteger(ex.targetRir) || !Number.isInteger(ex.sets)) {
                return ["Algum numero informado esta invalido"]
            } 
            if (ex.repMax > LIMIT_REPMAX|| ex.repMin <= LIMIT_REPMIN || ex.repMax < ex.repMin) {
                return ["Burro pra karai KKKK, numero de reps invalido"]
            }
            if (ex.targetRir < TARGET_RIRMIN || ex.targetRir > TARGET_RIRMAX) {
                return ["Neguin se ta deixando muito na reseva ou se digitou errado"]
            
            }
            if (ex.incrementKg < 0 || ex.incrementKg > 20 || !Number.isFinite(ex.incrementKg)) {
                return ["Erro no peso para subir"]
            } 
            if (ex.sets > TARGET_SETSMAX || ex.sets <= TARGET_SETSMIN ) {
                return ["Numero de sets invalido"]
            }
        }
    }
    return []
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}


export function isValidDate(value: unknown): value is string {
    if (typeof value !== "string") return false
    const m = DATE_RE.exec(value)
    if (!m) return false
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    const dt = new Date(Date.UTC(y, mo - 1, d))
    return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === mo - 1 &&
        dt.getUTCDate() === d
    )
}