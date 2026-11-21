import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, type Firestore } from 'firebase/firestore'
import { loadExerciseStates } from '../src/data/reads.ts'

const UID = 'alice'
const OUTRO = 'bob'
let testEnv: RulesTestEnvironment

const dbDe = (uid: string) => testEnv.authenticatedContext(uid).firestore() as unknown as Firestore
const semear = (uid: string, id: string, data: Record<string, unknown>) =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore() as unknown as Firestore, 'users', uid, 'exerciseState', id), data)
    })
const valido = (loadKg = 40) => ({ lastDate: '2026-11-14', lastSets: [{ reps: 10, loadKg }], suggestedLoadKg: loadKg, suggestedReps: 11 })

before(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'demo-webappacademia',
        firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') },
    })
})
after(async () => { await testEnv.cleanup() })
beforeEach(async () => { await testEnv.clearFirestore() })

describe('loadExerciseStates', () => {
    test('coleção vazia: ok com mapa vazio', async () => {
        const r = await loadExerciseStates(dbDe(UID), UID)
        assert.ok(r.ok)
        assert.equal(r.data.size, 0)
    })

    test('documentos válidos: mapa por exerciseId', async () => {
        await semear(UID, 'supino-reto', valido(40))
        await semear(UID, 'agachamento', valido(60))
        const r = await loadExerciseStates(dbDe(UID), UID)
        assert.ok(r.ok)
        assert.equal(r.data.size, 2)
        assert.equal(r.data.get('supino-reto')?.suggestedLoadKg, 40)
        assert.equal(r.data.get('agachamento')?.suggestedLoadKg, 60)
    })

    test('documento corrompido é pulado e os outros continuam', async () => {
        await semear(UID, 'supino-reto', valido(40))
        await semear(UID, 'quebrado', { lastDate: 20261114 })
        await semear(UID, 'agachamento', valido(60))
        const r = await loadExerciseStates(dbDe(UID), UID)
        assert.ok(r.ok)
        assert.deepEqual([...r.data.keys()].sort(), ['agachamento', 'supino-reto'])
    })

    test('lastSets com série inválida é pulado', async () => {
        await semear(UID, 'supino-reto', valido(40))
        await semear(UID, 'serie-ruim', { ...valido(50), lastSets: [{ reps: 'abc', loadKg: 50 }] })
        const r = await loadExerciseStates(dbDe(UID), UID)
        assert.ok(r.ok)
        assert.deepEqual([...r.data.keys()], ['supino-reto'])
    })

    test('só lê o estado do usuário pedido', async () => {
        await semear(UID, 'supino-reto', valido(40))
        await semear(OUTRO, 'remada', valido(30))
        const r = await loadExerciseStates(dbDe(UID), UID)
        assert.ok(r.ok)
        assert.deepEqual([...r.data.keys()], ['supino-reto'])
    })

    test('ler a conta de outro usuário é barrado pelas rules: ok:false e mensagem de leitura', async () => {
        await semear(OUTRO, 'remada', valido(30))
        const r = await loadExerciseStates(dbDe(UID), OUTRO)
        assert.equal(r.ok, false)
        if (!r.ok) {
            assert.ok(r.message.length > 0)
            assert.doesNotMatch(r.message, /salv/i)
        }
    })
})