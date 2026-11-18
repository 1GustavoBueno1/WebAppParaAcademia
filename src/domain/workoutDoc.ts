import { isValidDate } from './validation.ts'
import type { ExerciseState, SetLog, Workout } from './types.ts'
import { isRecord } from './validation.ts'

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
    if (!readLastDate(data.lastDate)) return null
    
}