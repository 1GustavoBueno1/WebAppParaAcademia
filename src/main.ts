import './styles.css'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth, db } from './firebase-config.ts'
import type { Plan, PlanDay } from './domain/types.ts'
import { ensureUserDoc } from './data/users.ts'
import { loadPlans } from './data/reads.ts'
import { authErrorMessage } from './ui/authErrors.ts'
import { toast } from './ui/dom.ts'
import { loginScreen, signupScreen } from './screens/auth.ts'
import { loadError, loading, shell, type AppDeps } from './screens/shell.ts'
import { templatesScreen } from './screens/templates.ts'
import { planListScreen, planScreen } from './screens/plans.ts'
import { workoutScreen } from './screens/workout.ts'

function getRoot(): HTMLElement {
    const el = document.getElementById('app')
    if (el === null) throw new Error('Elemento #app não encontrado no index.html')
    return el
}
const root = getRoot()

// Cada troca de tela incrementa navId. Uma tela só mexe no DOM se ainda for a atual.
let navId = 0
// Enquanto o cadastro roda (createUser → updateProfile → ensureUserDoc), o
// onAuthStateChanged não navega: quem conclui é a própria tela de cadastro.
let signupInFlight = false

function show(build: (isCurrent: () => boolean) => HTMLElement): void {
    const id = ++navId
    const isCurrent = (): boolean => id === navId
    // replaceChildren tira a tela anterior inteira (e os listeners presos a ela).
    root.replaceChildren(build(isCurrent))
    window.scrollTo(0, 0)
}

function leave(confirmLeave?: () => boolean): void {
    if (confirmLeave && !confirmLeave()) return
    signOut(auth).catch((err: unknown) => toast(authErrorMessage(err)))
}

function depsFor(user: User, isCurrent: () => boolean): AppDeps {
    return { db, user, isCurrent, signOut: leave }
}

// ---------- telas sem login ----------

function showLogin(): void {
    show(() => loginScreen(auth, showSignup))
}

function showSignup(): void {
    show(() => signupScreen(auth, db, {
        begin: () => { signupInFlight = true },
        abort: () => { signupInFlight = false },
        finish: (user) => {
            signupInFlight = false
            void enter(user)
        },
    }, showLogin))
}

// ---------- telas logadas ----------

async function enter(user: User): Promise<void> {
    let isCurrent: () => boolean = () => false
    show(c => {
        isCurrent = c
        return shell(depsFor(user, c), { title: 'Treino' }, loading())
    })

    // Não é erro de login: os dados do app não dependem desse documento.
    const doc = await ensureUserDoc(db, user.uid, user.displayName ?? '')
    if (!doc.ok) console.warn(`ensureUserDoc: ${doc.message}`)
    if (!isCurrent()) return

    const r = await loadPlans(db, user.uid)
    if (!isCurrent()) return
    if (!r.ok) {
        const message = r.message
        show(c => shell(depsFor(user, c), { title: 'Treino' }, loadError(message, () => void enter(user))))
        return
    }
    routePlans(user, r.data)
}

function routePlans(user: User, plans: Map<string, Plan>): void {
    if (plans.size === 0) {
        show(c => templatesScreen(depsFor(user, c), () => void enter(user)))
        return
    }
    const [first] = plans.keys()
    if (plans.size === 1 && first !== undefined) {
        showPlan(user, plans, first)
        return
    }
    showPlanList(user, plans)
}

function showPlanList(user: User, plans: Map<string, Plan>): void {
    show(c => planListScreen(depsFor(user, c), plans, id => showPlan(user, plans, id)))
}

function showPlan(user: User, plans: Map<string, Plan>, planId: string): void {
    const plan = plans.get(planId)
    if (plan === undefined) {
        showPlanList(user, plans)
        return
    }
    show(c => planScreen(depsFor(user, c), plan, {
        back: plans.size > 1 ? () => showPlanList(user, plans) : undefined,
        openDay: (day: PlanDay) => showWorkout(user, plans, planId, plan, day),
    }))
}

function showWorkout(user: User, plans: Map<string, Plan>, planId: string, plan: Plan, day: PlanDay): void {
    show(c => workoutScreen(depsFor(user, c), plan, day, {
        back: () => showPlan(user, plans, planId),
        saved: () => showPlan(user, plans, planId),
    }))
}

// ---------- início ----------

show(() => {
    const p = document.createElement('p')
    p.className = 'state state-loading'
    p.textContent = 'Carregando…'
    return p
})

onAuthStateChanged(auth, (user) => {
    if (user === null) {
        signupInFlight = false
        showLogin()
        return
    }
    if (signupInFlight) return
    void enter(user)
})
