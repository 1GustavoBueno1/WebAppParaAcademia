import { describe, test, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, type Firestore } from 'firebase/firestore'
import { ensureUserDoc } from '../src/data/users.ts'

let testEnv: RulesTestEnvironment
const MSG_NOME = 'O nome precisa ter de 2 a 50 caracteres.'

// A recusa tem que vir da validação do app, não de um PERMISSION_DENIED das rules.
function recusaPorNome(r: { ok: boolean; message?: string }): void {
    assert.equal(r.ok, false)
    assert.equal(r.message, MSG_NOME)
}

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

async function nomeGravado(uid: string): Promise<unknown> {
    const snap = await getDoc(doc(dbDe(uid), 'users', uid))
    return snap.exists() ? snap.data().displayName : undefined
}

describe('ensureUserDoc', () => {
    test('nome com espaços nas pontas é gravado sem eles', async () => {
        const r = await ensureUserDoc(dbDe('ana'), 'ana', '  Ana Paula  ')
        assert.equal(r.ok, true)
        assert.equal(await nomeGravado('ana'), 'Ana Paula')
    })

    test('" a " tem 1 caractere depois do trim: recusa sem gravar', async () => {
        recusaPorNome(await ensureUserDoc(dbDe('bia'), 'bia', ' a '))
        assert.equal(await nomeGravado('bia'), undefined)
    })

    test('50 caracteres com espaços em volta: aceita', async () => {
        const nome = 'x'.repeat(50)
        const r = await ensureUserDoc(dbDe('cid'), 'cid', ` ${nome} `)
        assert.equal(r.ok, true)
        assert.equal(await nomeGravado('cid'), nome)
    })

    test('51 caracteres: recusa', async () => {
        recusaPorNome(await ensureUserDoc(dbDe('dan'), 'dan', 'x'.repeat(51)))
    })

    test('nome vazio ou null: recusa', async () => {
        recusaPorNome(await ensureUserDoc(dbDe('eva'), 'eva', ''))
        recusaPorNome(await ensureUserDoc(dbDe('eva'), 'eva', null))
    })

    test('documento já existe: ok sem validar o nome nem alterar', async () => {
        await ensureUserDoc(dbDe('fab'), 'fab', 'Fabio')
        const r = await ensureUserDoc(dbDe('fab'), 'fab', '')
        assert.equal(r.ok, true)
        assert.equal(await nomeGravado('fab'), 'Fabio')
    })
})
