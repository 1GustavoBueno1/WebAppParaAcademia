// Testes do "hoje" local, da data futura e do limite de séries.
// TZ fixo: o resultado não depende do fuso da máquina que roda o teste.
process.env.TZ = 'America/Sao_Paulo'

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { todayLocal, validateWorkout } from '../src/domain/validation.ts'
import type { SetLog, Workout } from '../src/domain/types.ts'
import process from 'node:process'

// Ajuste para o que o SEU validateWorkout considera válido
// (formato de ids, faixa de reps/carga etc.).
function makeSets(n: number): SetLog[] {
    return Array.from({ length: n }, () => ({ reps: 10, loadKg: 40 }))
}

function makeWorkout(date: string, setsPerExercise = 3): Workout {
    return {
        date,
        planDayId: 'day-a',
        exercises: [{ exerciseId: 'supino-reto', sets: makeSets(setsPerExercise) }],
    }
}

describe('todayLocal', () => {
    test('23:30 em São Paulo ainda é o mesmo dia (toISOString daria o dia seguinte)', () => {
        assert.equal(todayLocal(new Date('2026-11-17T23:30:00-03:00')), '2026-11-17')
    })

    test('logo depois da meia-noite já é o dia novo', () => {
        assert.equal(todayLocal(new Date('2026-11-18T00:05:00-03:00')), '2026-11-18')
    })

    test('31/12 às 22:00 não vira o ano seguinte', () => {
        assert.equal(todayLocal(new Date('2026-12-31T22:00:00-03:00')), '2026-12-31')
    })

    test('mês e dia com zero à esquerda', () => {
        assert.equal(todayLocal(new Date('2026-01-09T10:00:00-03:00')), '2026-01-09')
    })

    test('sem argumento devolve uma data no formato yyyy-mm-dd', () => {
        assert.match(todayLocal(), /^\d{4}-\d{2}-\d{2}$/)
    })
})

describe('validateWorkout: data futura', () => {
    const today = '2026-11-17'

    test('treino de hoje é aceito', () => {
        assert.deepEqual(validateWorkout(makeWorkout('2026-11-17'), today), [])
    })

    test('treino de ontem é aceito', () => {
        assert.deepEqual(validateWorkout(makeWorkout('2026-11-16'), today), [])
    })

    test('treino antigo é aceito', () => {
        assert.deepEqual(validateWorkout(makeWorkout('2025-03-01'), today), [])
    })

    test('treino de amanhã é recusado', () => {
        assert.equal(validateWorkout(makeWorkout('2026-11-18'), today).length, 1)
    })

    test('virada de ano: 2027-01-01 com hoje = 2026-12-31 é recusado', () => {
        assert.equal(validateWorkout(makeWorkout('2027-01-01'), '2026-12-31').length, 1)
    })

    test('sem passar today, usa o relógio: data de hoje é aceita', () => {
        assert.deepEqual(validateWorkout(makeWorkout(todayLocal())), [])
    })

    test('sem passar today, usa o relógio: data bem no futuro é recusada', () => {
        assert.equal(validateWorkout(makeWorkout('2999-01-01')).length, 1)
    })
})

describe('validateWorkout: limite de séries (bate com a rule de lastSets ≤ 20)', () => {
    const today = '2026-11-17'

    test('20 séries é aceito', () => {
        assert.deepEqual(validateWorkout(makeWorkout('2026-11-17', 20), today), [])
    })

    test('21 séries é recusado', () => {
        assert.equal(validateWorkout(makeWorkout('2026-11-17', 21), today).length, 1)
    })
})