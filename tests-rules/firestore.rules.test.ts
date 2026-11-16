
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, test } from 'node:test'
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'

let env: RulesTestEnvironment
const now = () => firebase.firestore.FieldValue.serverTimestamp()

before(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-academia',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    })
})
beforeEach(async () => { await env.clearFirestore() })
after(async () => { await env.cleanup() })

const alice = () => env.authenticatedContext('alice').firestore()
const bob = () => env.authenticatedContext('bob').firestore()
const anon = () => env.unauthenticatedContext().firestore()

async function seed(path: string, data: Record<string, unknown>) {
    await env.withSecurityRulesDisabled(async ctx => { await ctx.firestore().doc(path).set(data) })
}

const workout = (over: Record<string, unknown> = {}) => ({
    date: '2026-11-16', planDayId: 'upper-a',
    exercises: [{ exerciseId: 'bench', sets: [{ reps: 8, loadKg: 60 }] }],
    ...over,
})

test('users: dono cria o próprio doc com serverTimestamp', async () => {
    await assertSucceeds(alice().doc('users/alice').set({ displayName: 'Alice', createdAt: now() }))
})

test('users: não cria doc de outro usuário nem deslogado', async () => {
    await assertFails(bob().doc('users/alice').set({ displayName: 'Bob', createdAt: now() }))
    await assertFails(anon().doc('users/alice').set({ displayName: 'X', createdAt: now() }))
})

test('users: recusa campo extra, data do cliente e nome fora do tamanho', async () => {
    await assertFails(alice().doc('users/alice').set({ displayName: 'Alice', createdAt: now(), admin: true }))
    await assertFails(alice().doc('users/alice').set({ displayName: 'Alice', createdAt: new Date() }))
    await assertFails(alice().doc('users/alice').set({ displayName: 'A', createdAt: now() }))
    await assertFails(alice().doc('users/alice').set({ displayName: 'x'.repeat(51), createdAt: now() }))
})

test('users: só o dono lê', async () => {
    await seed('users/alice', { displayName: 'Alice', createdAt: new Date() })
    await assertSucceeds(alice().doc('users/alice').get())
    await assertFails(bob().doc('users/alice').get())
    await assertFails(anon().doc('users/alice').get())
})

test('users: update só do nome; delete proibido', async () => {
    await seed('users/alice', { displayName: 'Alice', createdAt: new Date() })
    await assertSucceeds(alice().doc('users/alice').update({ displayName: 'Alice B' }))
    await assertFails(alice().doc('users/alice').update({ createdAt: new Date() }))
    await assertFails(alice().doc('users/alice').delete())
})

test('templates e exercises: leitura só logado, escrita nunca', async () => {
    await seed('templates/ppl', { name: 'PPL' })
    await seed('exercises/bench', { name: 'Supino' })
    await assertSucceeds(alice().doc('templates/ppl').get())
    await assertSucceeds(alice().doc('exercises/bench').get())
    await assertFails(anon().doc('templates/ppl').get())
    await assertFails(alice().doc('templates/ppl').set({ name: 'hack' }))
    await assertFails(alice().doc('exercises/novo').set({ name: 'hack' }))
})


test('workouts: dono grava treino válido; outro usuário não lê nem grava', async () => {
    await assertSucceeds(alice().doc('users/alice/workouts/w1').set(workout()))
    await assertSucceeds(alice().doc('users/alice/workouts/w2').set(workout({ note: 'ok' })))
    await assertFails(bob().doc('users/alice/workouts/w3').set(workout()))
    await assertFails(bob().doc('users/alice/workouts/w1').get())
})

test('workouts: recusa topo inválido', async () => {
    await assertFails(alice().doc('users/alice/workouts/a').set(workout({ date: '16/11/2026' })))
    await assertFails(alice().doc('users/alice/workouts/b').set(workout({ exercises: [] })))
    await assertFails(alice().doc('users/alice/workouts/c').set(workout({ planDayId: '' })))
    await assertFails(alice().doc('users/alice/workouts/d').set(workout({ note: 'x'.repeat(501) })))
    await assertFails(alice().doc('users/alice/workouts/e').set(workout({ extra: 1 })))
    const many = Array.from({ length: 101 }, (_, i) => ({ exerciseId: `e${i}`, sets: [{ reps: 1, loadKg: 0 }] }))
    await assertFails(alice().doc('users/alice/workouts/f').set(workout({ exercises: many })))
})

test('plans: válido passa; sem dias ou sem nome não', async () => {
    const plan = { name: 'Meu plano', days: [{ id: 'a', name: 'A', exercises: [] }] }
    await assertSucceeds(alice().doc('users/alice/plans/p1').set(plan))
    await assertSucceeds(alice().doc('users/alice/plans/p2').set({ ...plan, templateId: 'ppl' }))
    await assertFails(alice().doc('users/alice/plans/p3').set({ ...plan, days: [] }))
    await assertFails(alice().doc('users/alice/plans/p4').set({ days: plan.days }))
})

test('exerciseState: aceita sugestão first (carga null)', async () => {
    const state = { lastDate: '2026-11-16', lastSets: [{ reps: 8, loadKg: 60 }], suggestedLoadKg: null, suggestedReps: 8 }
    await assertSucceeds(alice().doc('users/alice/exerciseState/bench').set(state))
    await assertSucceeds(alice().doc('users/alice/exerciseState/bench').set({ ...state, suggestedLoadKg: 62.5 }))
    const { suggestedReps, ...withoutReps } = state
    void suggestedReps
    await assertFails(alice().doc('users/alice/exerciseState/bench').set(withoutReps))
})

test('metrics: id igual à data e pelo menos um campo', async () => {
    await assertSucceeds(alice().doc('users/alice/metrics/2026-11-16').set({ date: '2026-11-16', weightKg: 80.5 }))
    await assertSucceeds(alice().doc('users/alice/metrics/2026-11-17').set({ date: '2026-11-17', waistCm: 85 }))
    await assertFails(alice().doc('users/alice/metrics/2026-11-18').set({ date: '2026-11-19', weightKg: 80 }))
    await assertFails(alice().doc('users/alice/metrics/2026-11-20').set({ date: '2026-11-20' }))
    await assertFails(alice().doc('users/alice/metrics/2026-11-21').set({ date: '2026-11-21', weightKg: 19 }))
})

test('customExercises: exige prefixo custom- e unit válida', async () => {
    await assertSucceeds(alice().doc('users/alice/customExercises/custom-rosca').set({ name: 'Rosca', unit: 'reps' }))
    await assertFails(alice().doc('users/alice/customExercises/rosca').set({ name: 'Rosca', unit: 'reps' }))
    await assertFails(alice().doc('users/alice/customExercises/custom-x').set({ name: 'X', unit: 'minutes' }))
})

test('subcoleção não declarada é recusada', async () => {
    await assertFails(alice().doc('users/alice/lixo/qualquer').set({ a: 1 }))
})