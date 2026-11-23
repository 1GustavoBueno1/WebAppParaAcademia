import { isValidDate, isRecord, isSetLog, isNonEmptyString, isIntBetween } from './validation.ts'
import type { ExerciseState, SetLog, Workout, Plan, PlanDay, PlanExercise } from './types.ts'



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
    const rawSets = data.lastSets
    if (!Array.isArray(rawSets) || rawSets.length === 0 || rawSets.length > 20) return null
    const lastSets: SetLog[] = []
    for (const item of rawSets) {
        if (!isSetLog(item)) return null
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

function parsePlanExercise(v: unknown): PlanExercise | null {
    if (!isRecord(v)) return null

    const exerciseId = v.exerciseId
    if (!isNonEmptyString(exerciseId, 64)) return null

    const name = v.name
    if (!isNonEmptyString(name, 100)) return null

    const sets = v.sets
    if (!isIntBetween(sets, 1, 20)) return null

    const repMin = v.repMin
    const repMax = v.repMax
    if (!isIntBetween(repMin, 1, 600)) return null
    if (!isIntBetween(repMax, 1, 600)) return null
    if (repMin > repMax) return null

    const targetRir = v.targetRir
    if (!isIntBetween(targetRir, 0, 10)) return null

    const incrementKg = v.incrementKg
    if (typeof incrementKg !== 'number' || !Number.isFinite(incrementKg)) return null
    if (incrementKg < 0 || incrementKg > 1000) return null

    const notes = v.notes
    if (notes !== undefined && !isNonEmptyString(notes, 500)) return null

    const unit = v.unit
    if (unit !== undefined && unit !== 'reps' && unit !== 'seconds') return null

    const ex: PlanExercise = { exerciseId, name, sets, repMin, repMax, targetRir, incrementKg }
    if (notes !== undefined) ex.notes = notes
    if (unit !== undefined) ex.unit = unit
    return ex
}

function parsePlanDay(v: unknown): PlanDay | null {
    if (!isRecord(v)) return null

    const id = v.id
    if (!isNonEmptyString(id, 64)) return null

    const name = v.name
    if (!isNonEmptyString(name, 100)) return null

    const rawExercises = v.exercises
    if (!Array.isArray(rawExercises)) return null
    if (rawExercises.length === 0 || rawExercises.length > 100) return null

    const exercises: PlanExercise[] = []
    const seen = new Set<string>()
    for (const item of rawExercises) {
        const ex = parsePlanExercise(item)
        if (ex === null) return null
        if (seen.has(ex.exerciseId)) return null
        seen.add(ex.exerciseId)
        exercises.push(ex)
    }

    return { id, name, exercises }
}


export function parsePlan(data: unknown): Plan | null {
    if (!isRecord(data)) return null
    const name = data.name
    if(!isNonEmptyString(name, 100)) return null
    const templateId = data.templateId
    if (!isNonEmptyString(templateId, 100)) return null
    if (templateId !== undefined) data.templateId = templateId
    const setIdSeen = new Set<string>();
    const daysCru = data.days
    if (!Array.isArray(daysCru)) return null
    if (daysCru.length === 0 || daysCru.length > 30) return null
    const days: PlanDay[] = []
    for (const item of daysCru) {
        const day = parsePlanDay(item)
        if (day === null) return null

        if (setIdSeen.has(day.id)) return null
        setIdSeen.add(day.id)

        days.push(day)
    }
}