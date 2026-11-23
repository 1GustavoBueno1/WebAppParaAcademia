
/// Plano de treino
export interface PlanExercise {
    exerciseId: string,
    name: string,
    sets: number,
    repMin: number,
    repMax: number,
    targetRir: number,
    incrementKg: number,
    notes?: string,
    unit?: 'reps' | 'seconds'
}

export interface PlanDay {
    id: string,
    name: string,
    exercises: PlanExercise[],
}

export interface Plan {
    name: string,
    days: PlanDay[],
    templateId?: string
}

/// Treino

export interface SetLog {
    reps: number,
    loadKg: number,
    rir?: number
}

export interface WorkoutExercise {
    exerciseId: string,
    name?: string,
    unit?: 'reps' | 'seconds',
    sets: SetLog[]
}

export interface Workout {
    date: string,
    planDayId: string,
    exercises: WorkoutExercise[],
    note?: string
}

/// Progressão

export interface ExerciseState {
    lastDate: string,
    lastSets: SetLog[],
    suggestedLoadKg: number | null,
    suggestedReps: number
}

export interface Suggestion {
    loadKg: number | null,
    reps: number,
    reason: 'first' | 'increase-load' | 'add-reps' | 'hold' | 'at-max'
}

// corpo

export interface Metric {
    date: string,
    weightKg?: number,
    waistCm?: number
}

/// catologo

export interface CustomExercise {
    name: string,
    unit: 'reps' | 'seconds'
}