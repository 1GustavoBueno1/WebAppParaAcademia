import type { PlanExercise, Suggestion, SetLog } from "./types.ts";

import { MAX_LOAD_KG} from "./validation.ts";

export function suggestNext(exercise: PlanExercise, lastSets: SetLog[]): Suggestion {
    const {repMin, repMax, incrementKg, sets: plannedSets} = exercise
    if (lastSets.length == 0) {
        return { loadKg: null, reps: repMin, reason: 'first'}
    }

    const loadKg = Math.max(...lastSets.map(s => s.loadKg))

    const worstReps = Math.min(...lastSets.map(s => s.reps))

    if (worstReps < repMin) {
        return { loadKg, reps: repMin, reason: 'hold'}
    }

    const allAtTop = lastSets.length >= plannedSets && lastSets.every(s => s.reps >= repMax && s.loadKg == loadKg)

    if (allAtTop) {
    const nextLoad = Math.round((loadKg + incrementKg) * 100) / 100

    if (incrementKg === 0 || nextLoad > MAX_LOAD_KG) {
        return {loadKg, reps: repMax, reason: 'at-max'}
    }
    return {loadKg: nextLoad, reps: repMin, reason: 'increase-load'}
}
    if (worstReps >= repMax) {
        return { loadKg, reps: repMax, reason: 'hold'}
    }
    return {loadKg, reps: worstReps + 1, reason: 'add-reps'}
}