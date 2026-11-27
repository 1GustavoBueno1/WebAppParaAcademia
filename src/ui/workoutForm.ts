// Monta o Workout a partir do que foi digitado na tela de treino.
// Puro: sem DOM e sem Firebase, para poder ser testado com node --test.
import type { PlanExercise, SetLog, Workout, WorkoutExercise } from '../domain/types.ts'
import { MAX_LOAD_KG, MAX_NOTE_LENGTH, MAX_SECONDS, MIN_LOAD_KG, isValidDate } from '../domain/validation.ts'

// Mesmos limites do validateWorkout (LIMIT_REPMAX e TARGET_RIRMAX não são exportados).
const MAX_REPS = 100
const MAX_RIR = 10

export interface SetRowInput {
    reps: string
    load: string
    rir: string
    done: boolean
}

export interface ExerciseInput {
    exercise: PlanExercise
    rows: SetRowInput[]
}

export interface WorkoutFormInput {
    date: string
    today: string
    planDayId: string
    note: string
    exercises: ExerciseInput[]
}

export interface FieldError {
    exerciseIndex: number
    rowIndex: number
    field: 'reps' | 'load' | 'rir'
    message: string
}

export type BuildResult =
    | { ok: true; workout: Workout }
    | { ok: false; message: string; fieldErrors: FieldError[]; dateError: boolean }

/** '' → null. Aceita vírgula ou ponto. Texto que não é número → NaN. */
export function parseDecimal(raw: string): number | null {
    const s = raw.trim().replace(',', '.')
    if (s === '') return null
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN
    return Number(s)
}

/** '' → null. Só dígitos. Qualquer outra coisa → NaN. */
export function parseInteger(raw: string): number | null {
    const s = raw.trim()
    if (s === '') return null
    if (!/^\d+$/.test(s)) return NaN
    return Number(s)
}

function parseRow(row: SetRowInput, ex: PlanExercise, exerciseIndex: number, rowIndex: number, errors: FieldError[]): SetLog | null {
    const seconds = ex.unit === 'seconds'
    const maxReps = seconds ? MAX_SECONDS : MAX_REPS
    const err = (field: FieldError['field'], message: string) => errors.push({ exerciseIndex, rowIndex, field, message })
    const before = errors.length

    const reps = parseInteger(row.reps)
    if (reps === null) err('reps', seconds ? 'Informe os segundos.' : 'Informe as repetições.')
    else if (Number.isNaN(reps) || reps < 1 || reps > maxReps) err('reps', `${seconds ? 'Segundos' : 'Repetições'}: número inteiro de 1 a ${maxReps}.`)

    const load = parseDecimal(row.load)
    if (load === null) err('load', 'Informe a carga (0 se for peso do corpo).')
    else if (Number.isNaN(load) || load < MIN_LOAD_KG || load > MAX_LOAD_KG) err('load', `Carga: número de ${MIN_LOAD_KG} a ${MAX_LOAD_KG} kg.`)

    const rir = parseInteger(row.rir)
    if (rir !== null && (Number.isNaN(rir) || rir > MAX_RIR)) err('rir', `RIR: número inteiro de 0 a ${MAX_RIR}.`)

    if (errors.length > before || reps === null || load === null) return null
    return rir === null ? { reps, loadKg: load } : { reps, loadKg: load, rir }
}

export function buildWorkout(input: WorkoutFormInput): BuildResult {
    const fieldErrors: FieldError[] = []
    const exercises: WorkoutExercise[] = []

    input.exercises.forEach(({ exercise, rows }, exerciseIndex) => {
        const sets: SetLog[] = []
        rows.forEach((row, rowIndex) => {
            if (!row.done) return
            const set = parseRow(row, exercise, exerciseIndex, rowIndex, fieldErrors)
            if (set !== null) sets.push(set)
        })
        if (sets.length === 0) return
        const we: WorkoutExercise = { exerciseId: exercise.exerciseId, name: exercise.name, sets }
        if (exercise.unit !== undefined) we.unit = exercise.unit
        exercises.push(we)
    })

    const dateError = !isValidDate(input.date) || input.date > input.today
    if (dateError) {
        return { ok: false, message: 'Escolha uma data válida, de hoje ou de antes.', fieldErrors, dateError }
    }
    if (fieldErrors.length > 0) {
        return { ok: false, message: 'Corrija os campos marcados em vermelho.', fieldErrors, dateError }
    }
    if (exercises.length === 0) {
        return { ok: false, message: 'Marque ao menos uma série feita (botão ✓) antes de salvar.', fieldErrors, dateError }
    }

    const note = input.note.trim().slice(0, MAX_NOTE_LENGTH)
    const workout: Workout = { date: input.date, planDayId: input.planDayId, exercises }
    if (note !== '') workout.note = note
    return { ok: true, workout }
}
