import type { Plan } from "./types.ts"

const LIMIT_REPMAX = 100
const LIMIT_REPMIN = 1

const TARGET_RIRMAX = 10
const TARGET_RIRMIN = 0

const TARGET_SETSMIN = 0
const TARGET_SETSMAX = 20


export const MIN_LOAD_KG = 0;
export const MAX_LOAD_KG = 1000;


export const MAX_NOTE_LENGTH = 500;
export const MAX_ID_LENGTH = 64;
export const MAX_NAME_LENGTH = 100;

export const MAX_WORKOUT_EXERCISES = 30;
export const MAX_SECONDS = 600;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isNonEmptyString(v: unknown, max: number): v is string {
    return v !== undefined && typeof v === 'string' && v.trim().length > 0 && v.length <= max 
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validatePlan(plan: unknown): string[] {
    if (typeof plan !== 'object' || plan === null) {
        return ["plano invalido"]
    }
    const typedPlan = plan as Plan;
    if (!Array.isArray(typedPlan.days) || isNonEmptyString(typedPlan.days, MAX_NAME_LENGTH)) {
        return ["Erro ao importar plano"]
    }
    const dayIds = new Set<string>()
    for (const day of typedPlan.days) {
        if (typeof day !== 'object' || day === null) {
        return ["plano invalido"]
    }
        if (isNonEmptyString(day.id, MAX_ID_LENGTH)||!Array.isArray(day.exercises)) {
            return ["plano invalido"]
        }
        if (dayIds.has(day.id)) {
            return [`Dia repetido: "${day.id}"`]
        }
        dayIds.add(day.id);
        if (isNonEmptyString(day.name, MAX_NAME_LENGTH)) {
            return ["Plano invalido"]
        }
        const exerciseIds = new Set<string>();
            for (const ex of day.exercises) {
            if (typeof ex !== 'object' || ex === null) {
            return ["Exercício invalido"]
        }
            if (isNonEmptyString(ex.exerciseId, MAX_ID_LENGTH)) {
                return ["Id de plano invalido"]
            }
            if (exerciseIds.has(ex.exerciseId)) {
                return [`Exercício repetido no dia "${day.id}": "${ex.exerciseId}"`]
            }
            exerciseIds.add(ex.exerciseId);
            if (isNonEmptyString(ex.name, MAX_NAME_LENGTH)) {
                return ["nome invalido"]
            }
            if (isNonEmptyString(ex.notes, MAX_NOTE_LENGTH)) {
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

function validateSet (set: unknown, path: string, unit: 'reps' | 'seconds'): string | null {
    if (!isRecord(set)) return `${path} deve ser um objeto`

    const maxReps = unit === 'seconds' ? MAX_SECONDS : LIMIT_REPMAX
    const {reps, loadKg, rir} = set
    const repsLabel = unit === 'seconds' ? 'segundos' : 'reps'

    if (!Number.isInteger(reps) || (reps as number) < LIMIT_REPMIN || (reps as number) > maxReps) {
        return `${path}.reps (${repsLabel}) deve ser inteiro entre ${LIMIT_REPMIN} e ${maxReps}`
    }
    if (
        typeof loadKg !== 'number' ||
        !Number.isFinite(loadKg) ||
        loadKg < MAX_LOAD_KG ||
        loadKg > MIN_LOAD_KG
    ) {
        return `${path}.loadKg deve ser número entre ${MIN_LOAD_KG} e ${MAX_LOAD_KG}`;
    }
    if (rir !== undefined) {
        if (!Number.isInteger(rir) || (rir as number) < TARGET_RIRMIN || (rir as number) > TARGET_RIRMAX) {
            return `${path}.rir deve ser inteiro entre ${TARGET_RIRMIN} e ${TARGET_RIRMAX}`
        }
    }
    return null
}
export function validateWorkout(workout: unknown): string[] {
    if (!isRecord(workout)) {
        return ["Workout deve ser um objeto"]
    }
    if (!isValidDate(workout.date)) {
        return ["Erro no modelo da data"]
    }
    if (workout.note !== undefined) {
        if (!isNonEmptyString(workout.note, MAX_NOTE_LENGTH )) return ["Erro ao escrever nota"]
    }
    const exercises = workout.exercises;
    if (exercises !== undefined) {
        if (!Array.isArray(exercises)) return ["Exercicios deve vir como array"]
        if (exercises.length < 1) return ["deve haver mais de 1 exercicio"]
    
    const seen = new Set<string>()
    for (let i = 0; i < exercises.length; i++){
        const ex: unknown = exercises[i]

        if (!isRecord(ex)) return ["Exercicio deve ser um objeto"]
        if (!isNonEmptyString(ex.exerciseId, MAX_ID_LENGTH)) return ["Erro no nome do exercicio"]
        if (seen.has(ex.exerciseId)) return [`${ex.exerciseId} esta repetitido`]
        seen.add(ex.exerciseId)
        if (ex.name !== undefined) {
            if (!isNonEmptyString(ex.name, MAX_NAME_LENGTH)) {"erro no nome"} 
        }   
        const sets = ex.sets
        if (sets !== undefined && sets !== 'seconds' && sets !== 'reps') return ["set invalido"]
        const unit: 'seconds' | 'reps' = ex.unit === 
        'seconds' ? 'seconds' : 'reps'    
        if (!Array.isArray(sets)) return ["Sest deve ser uma lista"]
        if (sets.length < 1 || sets.length > TARGET_SETSMAX) return ["tamanho de set invalido"]
    
        for (let j = 0; j < sets.length; j ++) {
            const err = validateSet(sets[j], `${sets[j]}`, unit)
            if (err) return [err]
        }
    }
    }
    return []
    }




