// Textos curtos das telas. Puro, sem DOM.
import type { ExerciseState, PlanExercise, SetLog } from '../domain/types.ts'

type Unit = 'reps' | 'seconds'

export function formatKg(kg: number): string {
    return kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

/** 3 × 8–12, ou 3 × 30–60 s. */
export function formatTarget(ex: PlanExercise): string {
    const range = ex.repMin === ex.repMax ? `${ex.repMin}` : `${ex.repMin}–${ex.repMax}`
    return `${ex.sets} × ${range}${ex.unit === 'seconds' ? ' s' : ''}`
}

/** '2026-11-12' → '12/11' (mesmo ano de hoje) ou '12/11/2025'. Sem Date. */
export function formatDateShort(date: string, today: string): string {
    const [y, m, d] = date.split('-')
    if (y === undefined || m === undefined || d === undefined) return date
    return y === today.slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${y}`
}

function amount(reps: number, unit: Unit): string {
    return unit === 'seconds' ? `${reps} s` : `${reps} reps`
}

/** 20 kg × 10, ou só 10 reps / 30 s quando não há carga. */
export function formatSet(s: SetLog, unit: Unit): string {
    if (s.loadKg === 0) return amount(s.reps, unit)
    return `${formatKg(s.loadKg)} kg × ${s.reps}${unit === 'seconds' ? ' s' : ''}`
}

export function formatSuggestion(state: ExerciseState, unit: Unit): string {
    if (state.suggestedLoadKg === null) return amount(state.suggestedReps, unit)
    return formatSet({ reps: state.suggestedReps, loadKg: state.suggestedLoadKg }, unit)
}
