import { describe, test, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore'
import { createPlanFromTemplate } from '../src/data/plans.ts'
import { loadPlans } from '../src/data/reads.ts'
import type { Plan } from '../src/domain/types.ts'

let testEnv: RulesTestEnvironment

before(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'demo-webapp-academia',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    })
})

afterEach(async () => {
    await testEnv.clearFirestore()
})

after(async () => {
    await testEnv.cleanup()
})

function dbDe(uid: string): Firestore {
    return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore
}

function exercicio(exerciseId: string) {
    return {
        exerciseId, name: exerciseId, sets: 3,
        repMin: 8, repMax: 12, targetRir: 2, incrementKg: 2.5,
    }
}

function template(name: string): Plan {
    return {
        name,
        days: [
            { id: 'dia-a', name: 'Dia A', exercises: [exercicio('supino-reto'), exercicio('crucifixo')] },
            { id: 'dia-b', name: 'Dia B', exercises: [exercicio('agachamento')] },
        ],
    }
}

// Lê o documento ignorando as rules, para conferir o que foi gravado de verdade.
async function existe(uid: string, planId: string): Promise<boolean> {
    let existe = false
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore() as unknown as Firestore
        existe = (await getDoc(doc(db, 'users', uid, 'plans', planId))).exists()
    })
    return existe
}

// Conta os planos do usuário ignorando as rules. Serve para IDs que não formam um caminho válido.
async function totalPlanos(uid: string): Promise<number> {
    let total = 0
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore() as unknown as Firestore
        total = (await getDocs(collection(db, 'users', uid, 'plans'))).size
    })
    return total
}

describe('createPlanFromTemplate', () => {
    test('cria o plano com o templateId como ID e como campo', async () => {
        const t = template('ABC')
        const r = await createPlanFromTemplate(dbDe('ana'), 'ana', 'abc', t)
        assert.deepEqual(r, { ok: true, id: 'abc' })

        const lido = await loadPlans(dbDe('ana'), 'ana')
        assert.ok(lido.ok)
        assert.deepEqual(lido.data.get('abc'), { ...t, templateId: 'abc' })
    })

    test('chamar duas vezes deixa um plano só', async () => {
        await createPlanFromTemplate(dbDe('ana'), 'ana', 'abc', template('ABC'))
        const r = await createPlanFromTemplate(dbDe('ana'), 'ana', 'abc', template('ABC'))
        assert.ok(r.ok)

        const lido = await loadPlans(dbDe('ana'), 'ana')
        assert.ok(lido.ok)
        assert.deepEqual([...lido.data.keys()], ['abc'])
    })

    test('templateId próprio do template é ignorado: vale o parâmetro', async () => {
        const t = { ...template('ABC'), templateId: 'outro' }
        await createPlanFromTemplate(dbDe('ana'), 'ana', 'abc', t)

        const lido = await loadPlans(dbDe('ana'), 'ana')
        assert.ok(lido.ok)
        assert.equal(lido.data.get('abc')?.templateId, 'abc')
        assert.equal(lido.data.has('outro'), false)
    })

    test('template inválido recusa e não grava nada', async () => {
        const invalido = { ...template('ABC'), name: '' }
        const r = await createPlanFromTemplate(dbDe('ana'), 'ana', 'abc', invalido)
        assert.equal(r.ok, false)
        assert.equal(await existe('ana', 'abc'), false)
    })

    test('templateId vazio recusa e não grava nada', async () => {
        const r = await createPlanFromTemplate(dbDe('ana'), 'ana', '', template('ABC'))
        assert.equal(r.ok, false)
        assert.equal(await totalPlanos('ana'), 0)
    })

    test('templateId com barra recusa e não grava em outro caminho', async () => {
        const r = await createPlanFromTemplate(dbDe('ana'), 'ana', 'x/y', template('ABC'))
        assert.equal(r.ok, false)
        assert.equal(await totalPlanos('ana'), 0)
    })

    test('gravar no uid de outro usuário é barrado pelas rules', async () => {
        const r = await createPlanFromTemplate(dbDe('ana'), 'bruno', 'abc', template('ABC'))
        assert.equal(r.ok, false)
        assert.equal(await existe('bruno', 'abc'), false)
    })

    test('deslogado é barrado', async () => {
        const db = testEnv.unauthenticatedContext().firestore() as unknown as Firestore
        const r = await createPlanFromTemplate(db, 'ana', 'abc', template('ABC'))
        assert.equal(r.ok, false)
        assert.equal(await existe('ana', 'abc'), false)
    })
})