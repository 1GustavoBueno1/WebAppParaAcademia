import { isValidDate } from './validation.ts'
import type { ExerciseState, SetLog, Workout } from './types.ts'
import { isRecord } from './validation.ts'
import { isSetLog } from './validation.ts'
export function readLastDate(data: unknown): string | null {
    if (typeof data !== 'object' || data === null) return null
    if (!('lastDate' in data)) return null
    const lastDate = data.lastDate
    if (typeof lastDate !== 'string') return null
    if (!isValidDate(lastDate)) return null
    return lastDate
}

export function cleanSets(sets: SetLog[]): SetLog[] {
    return sets.map(s =>
        s.rir === undefined
            ? { reps: s.reps, loadKg: s.loadKg }
            : { reps: s.reps, loadKg: s.loadKg, rir: s.rir },
    )
}
export function buildWorkoutDoc(workout: Workout) {
    const base = {
        date: workout.date,
        planDayId: workout.planDayId,
        exercises: workout.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            sets: cleanSets(ex.sets)
        }))}
    return workout.note === undefined ? base : {...base, note: workout.note}
}

export function parseExerciseState(data: unknown): ExerciseState | null {
    if (!isRecord(data)) return null
    const lastDate = data.lastDate
    if (!isValidDate(lastDate)) return null
    if (!readLastDate(lastDate)) return null
    const rawSets = data.lastSets
    if (!Array.isArray(rawSets) || rawSets.length === 0 || rawSets.length > 20) return null
    const lastSets: SetLog[] = []
    for (const item of rawSets) {
        if (!isSetLog) return null
        lastSets.push(item)
    }
    const suggestedLoadKg = data.suggestedLoadKg
    if (suggestedLoadKg !== null) {    
        if (typeof suggestedLoadKg !== 'number' || !Number.isFinite(suggestedLoadKg)) return null
        if (suggestedLoadKg < 0 || suggestedLoadKg > 1000) return null
    }
    const suggestedReps = data.suggestedReps
    if (typeof suggestedReps !== 'number' || !Number.isInteger(suggestedReps)) return null
    if (suggestedReps < 1 || suggestedReps > 600) return null

    return { lastDate, lastSets, suggestedLoadKg, suggestedReps }
}