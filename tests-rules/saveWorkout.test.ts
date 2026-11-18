// Testa saveWorkout contra o emulador do Firestore, com as firestore.rules reais.
// Rode com o emulador ativo (ex.: firebase emulators:exec --only firestore "node --test ...").
import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, type Firestore } from 'firebase/firestore'
import { saveWorkout, type SaveResult } from '../src/data/workouts.ts'
import { suggestNext } from '../src/domain/progression.ts'
import type { PlanExercise, SetLog, Workout } from '../src/domain/types.ts'

const UID = 'alice'
const OUTRO_UID = 'bob'

// Datas fixas no passado: o validateWorkout recusa data futura, e estas nunca viram futuro.
const D10 = '2026-11-10'
const D12 = '2026-11-12'
const D14 = '2026-11-14'

const SUPINO: PlanExercise = {
    exerciseId: 'supino-reto', name: 'Supino reto', sets: 3,
    repMin: 8, repMax: 12, targetRir: 2, incrementKg: 2.5,
}
const AGACHAMENTO: PlanExercise = {
    exerciseId: 'agachamento', name: 'Agachamento', sets: 3,
    repMin: 6, repMax: 10, targetRir: 2, incrementKg: 5,
}
const PLANO = [SUPINO, AGACHAMENTO]

const setsA: SetLog[] = [
    { reps: 10, loadKg: 40, rir: 2 },
    { reps: 9, loadKg: 40, rir: 1 },
]
const setsB: SetLog[] = [
    { reps: 12, loadKg: 42.5, rir: 2 },
    { reps: 11, loadKg: 42.5 },
]

function makeWorkout(date: string, exercises: Workout['exercises'], note?: string): Workout {
    const base: Workout = { date, planDayId: 'day-a', exercises }
    return note === undefined ? base : { ...base, note }
}

let testEnv: RulesTestEnvironment

// O contexto do rules-unit-testing devolve um Firestore da API compat; as funções
// modulares aceitam, mas os tipos não — por isso o cast em um único lugar.
function dbDe(uid: string): Firestore {
    return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore
}

// Leituras e escritas "de admin" (sem rules), para preparar e conferir o estado.
async function admin<T>(fn: (db: Firestore) => Promise<T>): Promise<T> {
    let out: T | undefined
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        out = await fn(ctx.firestore() as unknown as Firestore)
    })
    return out as T
}

const lerEstado = (uid: string, exerciseId: string) =>
    admin(async (db) => {
        const snap = await getDoc(doc(db, 'users', uid, 'exerciseState', exerciseId))
        return snap.exists() ? snap.data() : undefined
    })

const lerTreinos = (uid: string) =>
    admin(async (db) => {
        const snap = await getDocs(collection(db, 'users', uid, 'workouts'))
        return snap.docs.map(d => ({ id: d.id, data: d.data() }))
    })

const semearEstado = (uid: string, exerciseId: string, data: Record<string, unknown>) =>
    admin(db => setDoc(doc(db, 'users', uid, 'exerciseState', exerciseId), data))

function assertOk(r: SaveResult): asserts r is { ok: true; id: string } {
    assert.ok(r.ok, r.ok ? '' : `saveWorkout falhou: ${r.message}`)
}

before(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'demo-webappacademia',
        // O host vem de FIRESTORE_EMULATOR_HOST (definido pelo emulators:exec).
        firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') },
    })
})

after(async () => {
    await testEnv.cleanup()
})

beforeEach(async () => {
    await testEnv.clearFirestore()
})

describe('saveWorkout: caminho feliz', () => {
    test('primeiro treino do exercício: grava o treino e cria o exerciseState', async () => {
        const w = makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets: setsA }])
        const r = await saveWorkout(dbDe(UID), UID, w, PLANO)
        assertOk(r)

        const treinos = await lerTreinos(UID)
        assert.equal(treinos.length, 1)
        assert.equal(treinos[0]!.id, r.id)
        assert.deepEqual(treinos[0]!.data, {
            date: D12,
            planDayId: 'day-a',
            exercises: [{ exerciseId: SUPINO.exerciseId, sets: setsA }],
        })

        const s = suggestNext(SUPINO, setsA)
        assert.deepEqual(await lerEstado(UID, SUPINO.exerciseId), {
            lastDate: D12,
            lastSets: setsA,
            suggestedLoadKg: s.loadKg,
            suggestedReps: s.reps,
        })
    })

    test('treino mais novo atualiza o exerciseState', async () => {
        assertOk(await saveWorkout(dbDe(UID), UID, makeWorkout(D10, [{ exerciseId: SUPINO.exerciseId, sets: setsA }]), PLANO))
        assertOk(await saveWorkout(dbDe(UID), UID, makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets: setsB }]), PLANO))

        assert.equal((await lerTreinos(UID)).length, 2)
        const s = suggestNext(SUPINO, setsB)
        assert.deepEqual(await lerEstado(UID, SUPINO.exerciseId), {
            lastDate: D12,
            lastSets: setsB,
            suggestedLoadKg: s.loadKg,
            suggestedReps: s.reps,
        })
    })

    test('mesma data do último treino também atualiza (só data mais antiga é ignorada)', async () => {
        assertOk(await saveWorkout(dbDe(UID), UID, makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets: setsA }]), PLANO))
        assertOk(await saveWorkout(dbDe(UID), UID, makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets: setsB }]), PLANO))

        const estado = await lerEstado(UID, SUPINO.exerciseId)
        assert.deepEqual(estado?.lastSets, setsB)
    })
})

describe('saveWorkout: treino com data antiga', () => {
    test('o treino é salvo, mas o exerciseState não muda', async () => {
        assertOk(await saveWorkout(dbDe(UID), UID, makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets: setsA }]), PLANO))
        const antes = await lerEstado(UID, SUPINO.exerciseId)

        const r = await saveWorkout(dbDe(UID), UID, makeWorkout(D10, [{ exerciseId: SUPINO.exerciseId, sets: setsB }]), PLANO)
        assertOk(r)

        const treinos = await lerTreinos(UID)
        assert.equal(treinos.length, 2)
        assert.ok(treinos.some(t => t.id === r.id && t.data.date === D10))
        assert.deepEqual(await lerEstado(UID, SUPINO.exerciseId), antes)
    })
})

describe('saveWorkout: vários exercícios', () => {
    test('cada exercício é comparado com o PRÓPRIO estado (pareamento por índice)', async () => {
        // Agachamento tem estado mais novo que o treino; supino não tem estado.
        // O agachamento vem primeiro: se o índice se perdesse, o supino seria comparado
        // com o estado do agachamento e seria pulado por engano.
        await semearEstado(UID, AGACHAMENTO.exerciseId, {
            lastDate: D14, lastSets: setsA, suggestedLoadKg: 40, suggestedReps: 11,
        })

        const w = makeWorkout(D12, [
            { exerciseId: AGACHAMENTO.exerciseId, sets: setsB },
            { exerciseId: SUPINO.exerciseId, sets: setsA },
        ])
        assertOk(await saveWorkout(dbDe(UID), UID, w, PLANO))

        const agachamento = await lerEstado(UID, AGACHAMENTO.exerciseId)
        assert.equal(agachamento?.lastDate, D14, 'agachamento (antigo) não deveria mudar')
        const supino = await lerEstado(UID, SUPINO.exerciseId)
        assert.equal(supino?.lastDate, D12, 'supino (primeiro treino) deveria ser criado')
    })

    test('exercício fora do plano: o treino é salvo e nenhum exerciseState é criado para ele', async () => {
        const w = makeWorkout(D12, [
            { exerciseId: 'rosca-inventada', sets: setsA },
            { exerciseId: SUPINO.exerciseId, sets: setsA },
        ])
        const r = await saveWorkout(dbDe(UID), UID, w, PLANO)
        assertOk(r)

        const treinos = await lerTreinos(UID)
        assert.equal(treinos[0]!.data.exercises.length, 2, 'o treino guarda os dois exercícios')
        assert.equal(await lerEstado(UID, 'rosca-inventada'), undefined)
        assert.equal((await lerEstado(UID, SUPINO.exerciseId))?.lastDate, D12)
    })
})

describe('saveWorkout: campos opcionais (Firestore recusa undefined)', () => {
    test('série sem rir, ou com rir: undefined, não derruba a gravação', async () => {
        const sets = [
            { reps: 10, loadKg: 40 },
            { reps: 9, loadKg: 40, rir: undefined },
            { reps: 8, loadKg: 40, rir: 0 },
        ] satisfies SetLog[]
        const r = await saveWorkout(dbDe(UID), UID, makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets }]), PLANO)
        assertOk(r)

        const treino = (await lerTreinos(UID))[0]!.data
        const salvas: Record<string, unknown>[] = treino.exercises[0].sets
        assert.equal('rir' in salvas[0]!, false)
        assert.equal('rir' in salvas[1]!, false)
        assert.equal(salvas[2]!.rir, 0, 'rir 0 é um valor válido e precisa ficar')

        const estado = await lerEstado(UID, SUPINO.exerciseId)
        assert.equal('rir' in estado?.lastSets[0], false)
        assert.equal('rir' in estado?.lastSets[1], false)
    })

    test('note existe só quando informada', async () => {
        const comNote = await saveWorkout(dbDe(UID), UID, makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets: setsA }], 'dia pesado'), PLANO)
        assertOk(comNote)
        const semNote = await saveWorkout(dbDe(UID), UID, makeWorkout(D14, [{ exerciseId: SUPINO.exerciseId, sets: setsA }]), PLANO)
        assertOk(semNote)

        const treinos = await lerTreinos(UID)
        assert.equal(treinos.find(t => t.id === comNote.id)!.data.note, 'dia pesado')
        assert.equal('note' in treinos.find(t => t.id === semNote.id)!.data, false)
    })
})

describe('saveWorkout: falhas devolvem ok:false e nunca lançam', () => {
    test('treino inválido: não grava nada', async () => {
        const w = makeWorkout('2026-02-30', [{ exerciseId: SUPINO.exerciseId, sets: setsA }])
        const r = await saveWorkout(dbDe(UID), UID, w, PLANO)

        assert.equal(r.ok, false)
        assert.equal((await lerTreinos(UID)).length, 0)
        assert.equal(await lerEstado(UID, SUPINO.exerciseId), undefined)
    })

    test('gravar na conta de outro usuário é barrado pelas rules: ok:false e nada gravado', async () => {
        const w = makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets: setsA }])
        // dbDe(UID) está autenticado como alice, mas o uid alvo é bob
        const r = await saveWorkout(dbDe(UID), OUTRO_UID, w, PLANO)

        assert.equal(r.ok, false)
        if (!r.ok) assert.ok(r.message.length > 0, 'precisa haver mensagem para mostrar ao usuário')
        assert.equal((await lerTreinos(OUTRO_UID)).length, 0)
        assert.equal(await lerEstado(OUTRO_UID, SUPINO.exerciseId), undefined)
    })

    test('exerciseState corrompido no servidor é sobrescrito, não trava o salvamento', async () => {
        await semearEstado(UID, SUPINO.exerciseId, { lastDate: 20261114 })

        const r = await saveWorkout(dbDe(UID), UID, makeWorkout(D12, [{ exerciseId: SUPINO.exerciseId, sets: setsA }]), PLANO)
        assertOk(r)
        assert.equal((await lerEstado(UID, SUPINO.exerciseId))?.lastDate, D12)
    })
})