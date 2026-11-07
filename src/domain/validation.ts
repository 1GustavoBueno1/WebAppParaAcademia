import type { Plan } from "./types.ts"

export function validatePlan(plan: unknown): string[] {
    if (typeof plan !== 'object' || plan === null) {
        return ["plano invalido"]
    }
    const typedPlan = plan as Plan;
    if (!Array.isArray(typedPlan.days) || typedPlan.name === null ) {
        return ["Erro ao importar plano"]
    }
    for (const day of typedPlan.days) {
        if (day.id === null || day.name === null) {
            return ["plano invalido"]
        }
        for (const ex of day.exercises) {
            if (ex.repMax > 100 || ex.repMin <= 0 || ex.repMin > ex.repMax) {
                return ["Burro pra karai KKKK, numero de reps invalido"]
            }
            if (ex.targetRir < 0 || ex.targetRir > 5) {
                return ["Neguin se ta deixando muito na reseva ou se digitou errado"]
            }
            if (ex.incrementKg < 0 || ex.incrementKg > 20) {
                return ["Erro no peso para subir"]
            }

        }
    }
    return []
}
