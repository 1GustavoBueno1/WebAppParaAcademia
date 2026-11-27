// Testes da montagem do Workout a partir do que foi digitado na tela de treino.
// src/ui/workoutForm.ts é puro (sem DOM e sem Firebase), por isso roda aqui com node --test.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkout, parseDecimal, parseInteger, type ExerciseInput, type SetRowInput } from '../src/ui/workoutForm.ts'
import { formatDateShort, formatKg, formatSuggestion, formatTarget } from '../src/ui/format.ts'
import type { PlanExercise } from '../src/domain/types.ts'

const supino: PlanExercise = { exerciseId: 'supino-reto', name: 'Supino reto', sets: 3, repMin: 8, repMax: 12, targetRir: 2, incrementKg: 2.5 }
const prancha: PlanExercise = { exerciseId: 'prancha', name: 'Prancha', sets: 3, repMin: 30, repMax: 60, targetRir: 0, incrementKg: 0, unit: 'seconds' }

function row(reps: string, load: string, rir = '', done = true): SetRowInput {
    return { reps, load, rir, done }
}
function input(exercises: ExerciseInput[], note = '', date = '2026-11-20') {
    return { date, today: '2026-11-27', planDayId: 'dia-a', note, exercises }
}
function hasUndefined(v: unknown): boolean {
    if (v === undefined) return true
    if (typeof v === 'object' && v !== null) return Object.values(v).some(hasUndefined)
    return false
}

describe('parseDecimal / parseInteger', () => {
    test('vazio → null (não vira 0)', () => {
        assert.equal(parseDecimal(''), null)
        assert.equal(parseDecimal('   '), null)
        assert.equal(parseInteger(''), null)
    })
    test('vírgula decimal é aceita', () => assert.equal(parseDecimal('22,5'), 22.5))
    test('ponto decimal é aceito', () => assert.equal(parseDecimal('22.5'), 22.5))
    test('texto inválido → NaN', () => {
        assert.ok(Number.isNaN(parseDecimal('abc')))
        assert.ok(Number.isNaN(parseDecimal('1,2,3')))
        assert.ok(Number.isNaN(parseInteger('8.5')))
        assert.ok(Number.isNaN(parseInteger('-')))
    })
    test('inteiro válido', () => assert.equal(parseInteger(' 10 '), 10))
})

describe('buildWorkout', () => {
    test('só séries marcadas entram', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('10', '20'), row('9', '20', '', false)] }]))
        assert.equal(r.ok, true)
        if (!r.ok) return
        assert.deepEqual(r.workout.exercises[0]?.sets, [{ reps: 10, loadKg: 20 }])
    })
    test('série não marcada com lixo é ignorada', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('10', '20'), row('x', '', '', false)] }]))
        assert.equal(r.ok, true)
    })
    test('exercício sem série marcada fica de fora', () => {
        const r = buildWorkout(input([
            { exercise: supino, rows: [row('10', '20', '', false)] },
            { exercise: prancha, rows: [row('45', '0')] },
        ]))
        assert.equal(r.ok, true)
        if (!r.ok) return
        assert.deepEqual(r.workout.exercises.map(e => e.exerciseId), ['prancha'])
    })
    test('nenhuma série marcada → erro geral, sem erros de campo', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('10', '20', '', false)] }]))
        assert.equal(r.ok, false)
        if (r.ok) return
        assert.equal(r.fieldErrors.length, 0)
        assert.match(r.message, /Marque/)
    })
    test('carga vazia em série marcada → erro no campo', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('10', '')] }]))
        assert.equal(r.ok, false)
        if (r.ok) return
        assert.deepEqual(r.fieldErrors.map(e => [e.exerciseIndex, e.rowIndex, e.field]), [[0, 0, 'load']])
    })
    test('reps vazias em série marcada → erro no campo', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('', '20')] }]))
        assert.equal(r.ok, false)
        if (r.ok) return
        assert.equal(r.fieldErrors[0]?.field, 'reps')
    })
    test('RIR vazio fica fora do objeto; RIR 0 fica', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('10', '20'), row('10', '20', '0')] }]))
        assert.equal(r.ok, true)
        if (!r.ok) return
        const sets = r.workout.exercises[0]!.sets
        assert.equal('rir' in sets[0]!, false)
        assert.equal(sets[1]?.rir, 0)
    })
    test('RIR fora de 0–10 → erro', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('10', '20', '11')] }]))
        assert.equal(r.ok, false)
    })
    test('segundos aceitam até 600 e levam unit', () => {
        const r = buildWorkout(input([{ exercise: prancha, rows: [row('120', '0')] }]))
        assert.equal(r.ok, true)
        if (!r.ok) return
        assert.equal(r.workout.exercises[0]?.unit, 'seconds')
    })
    test('reps acima de 100 → erro', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('101', '20')] }]))
        assert.equal(r.ok, false)
    })
    test('observação vazia fica fora; com texto vai com trim', () => {
        const vazio = buildWorkout(input([{ exercise: supino, rows: [row('10', '20')] }], '   '))
        assert.equal(vazio.ok && 'note' in vazio.workout, false)
        const comTexto = buildWorkout(input([{ exercise: supino, rows: [row('10', '20')] }], '  ombro doeu '))
        assert.equal(comTexto.ok && comTexto.workout.note, 'ombro doeu')
    })
    test('data futura → erro', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('10', '20')] }], '', '2026-11-28'))
        assert.equal(r.ok, false)
        if (r.ok) return
        assert.equal(r.dateError, true)
    })
    test('data vazia → erro', () => {
        const r = buildWorkout(input([{ exercise: supino, rows: [row('10', '20')] }], '', ''))
        assert.equal(r.ok, false)
    })
    test('o Workout não tem undefined em nenhum nível', () => {
        const r = buildWorkout(input([
            { exercise: supino, rows: [row('10', '20'), row('8', '22,5', '1')] },
            { exercise: prancha, rows: [row('40', '0')] },
        ]))
        assert.equal(r.ok, true)
        if (!r.ok) return
        assert.equal(hasUndefined(r.workout), false)
    })
})

describe('format', () => {
    test('formatKg usa vírgula', () => assert.equal(formatKg(22.5), '22,5'))
    test('formatKg inteiro sem casas', () => assert.equal(formatKg(20), '20'))
    test('formatTarget reps', () => assert.equal(formatTarget(supino), '3 × 8–12'))
    test('formatTarget segundos', () => assert.equal(formatTarget(prancha), '3 × 30–60 s'))
    test('formatDateShort no mesmo ano', () => assert.equal(formatDateShort('2026-11-12', '2026-11-27'), '12/11'))
    test('formatDateShort em outro ano', () => assert.equal(formatDateShort('2025-12-30', '2026-11-27'), '30/12/2025'))
    test('sugestão sem carga mostra só as reps', () => {
        assert.equal(formatSuggestion({ lastDate: '2026-11-12', lastSets: [{ reps: 8, loadKg: 0 }], suggestedLoadKg: null, suggestedReps: 9 }, 'reps'), '9 reps')
    })
    test('sugestão com carga', () => {
        assert.equal(formatSuggestion({ lastDate: '2026-11-12', lastSets: [{ reps: 8, loadKg: 20 }], suggestedLoadKg: 22.5, suggestedReps: 8 }, 'reps'), '22,5 kg × 8')
    })
})
