import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkoutDoc, cleanSets, parsePlan, readLastDate } from '../src/domain/workoutDoc.ts'
function hasUndefined(v: unknown): boolean {
    if (v === undefined) return true
    if (typeof v === 'object' && v !== null) return Object.values(v).some(hasUndefined)
    return false
}

describe('readLastDate', () => {
    test('undefined (documento não existe) → null', () => assert.equal(readLastDate(undefined), null))
    test('null → null', () => assert.equal(readLastDate(null), null))
    test('string solta → null', () => assert.equal(readLastDate('2026-11-14'), null))
    test('objeto sem lastDate → null', () => assert.equal(readLastDate({}), null))
    test('lastDate numérico → null', () => assert.equal(readLastDate({ lastDate: 20261114 }), null))
    test('lastDate com formato errado → null', () => assert.equal(readLastDate({ lastDate: '14/11/2026' }), null))
    test('lastDate inexistente no calendário → null', () => assert.equal(readLastDate({ lastDate: '2026-02-30' }), null))
    test('lastDate válido → devolve a data', () => assert.equal(readLastDate({ lastDate: '2026-11-14' }), '2026-11-14'))
    test('campos extras não atrapalham', () => assert.equal(readLastDate({ lastDate: '2026-11-14', outro: 1 }), '2026-11-14'))
})

describe('cleanSets', () => {
    test('série sem rir continua sem o campo', () => {
        const [s] = cleanSets([{ reps: 10, loadKg: 40 }])
        assert.equal('rir' in s!, false)
    })
    test('rir: undefined explícito é removido', () => {
        const [s] = cleanSets([{ reps: 10, loadKg: 40, rir: undefined }])
        assert.equal('rir' in s!, false)
    })
    test('rir: 0 é mantido (0 não é "ausente")', () => {
        const [s] = cleanSets([{ reps: 10, loadKg: 40, rir: 0 }])
        assert.equal(s!.rir, 0)
    })
    test('rir com valor é mantido', () => {
        const [s] = cleanSets([{ reps: 10, loadKg: 40, rir: 2 }])
        assert.equal(s!.rir, 2)
    })
    test('não altera o array original', () => {
        const original = [{ reps: 10, loadKg: 40, rir: undefined }]
        cleanSets(original)
        assert.equal('rir' in original[0]!, true)
    })
})

describe('buildWorkoutDoc', () => {
    const base = { date: '2026-11-17', planDayId: 'day-a' }

    test('sem note: o campo não existe', () => {
        const d = buildWorkoutDoc({ ...base, exercises: [] })
        assert.equal('note' in d, false)
    })
    test('note: undefined explícito: o campo não existe', () => {
        const d = buildWorkoutDoc({ ...base, exercises: [], note: undefined })
        assert.equal('note' in d, false)
    })
    test('com note: o campo entra', () => {
        const d = buildWorkoutDoc({ ...base, exercises: [], note: 'dia pesado' })
        assert.equal('note' in d && d.note, 'dia pesado')
    })
    test('rir: undefined aninhado não vaza para o documento', () => {
        const d = buildWorkoutDoc({
            ...base,
            exercises: [{ exerciseId: 'supino', sets: [{ reps: 10, loadKg: 40, rir: undefined }] }],
        })
        assert.equal(hasUndefined(d), false)
    })
    test('mantém data, plano e exercícios', () => {
        const d = buildWorkoutDoc({
            ...base,
            exercises: [{ exerciseId: 'supino', sets: [{ reps: 10, loadKg: 40, rir: 2 }] }],
        })
        assert.deepEqual(d, {
            date: '2026-11-17',
            planDayId: 'day-a',
            exercises: [{ exerciseId: 'supino', sets: [{ reps: 10, loadKg: 40, rir: 2 }] }],
        })
    })
})
describe('parsePlan', () => {
    const template = () => ({
        name: 'ABC para iniciantes',
        days: [{ id: 'dia-a', name: 'Peito e tríceps', exercises: [
            { exerciseId: 'supino-reto', name: 'Supino reto', sets: 3, repMin: 8, repMax: 12, targetRir: 2, incrementKg: 2.5 },
        ] }],
    })
    test('template sem templateId é aceito e continua sem o campo', () => {
        const plan = parsePlan(template())
        assert.notEqual(plan, null)
        assert.equal('templateId' in plan!, false)
    })
    test('templateId válido é mantido', () => {
        assert.equal(parsePlan({ ...template(), templateId: 'abc-iniciante' })?.templateId, 'abc-iniciante')
    })
    test('templateId vazio → null', () => assert.equal(parsePlan({ ...template(), templateId: '' }), null))
    test('templateId numérico → null', () => assert.equal(parsePlan({ ...template(), templateId: 42 }), null))
    test('não altera o objeto recebido', () => {
        const raw = { ...template(), templateId: 'abc-iniciante' }
        const antes = JSON.stringify(raw)
        parsePlan(raw)
        assert.equal(JSON.stringify(raw), antes)
    })
})
