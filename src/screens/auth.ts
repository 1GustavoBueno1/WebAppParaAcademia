import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    type Auth,
    type User,
} from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { ensureUserDoc } from '../data/users.ts'
import { authErrorMessage } from '../ui/authErrors.ts'
import { h, messageBox, setBusy, setMessage } from '../ui/dom.ts'

const NAME_MIN = 2
const NAME_MAX = 50

function field(label: string, input: HTMLInputElement, hint?: string): { wrap: HTMLElement; error: HTMLElement } {
    const error = h('span', { class: 'field-error', id: `${input.id}-err` })
    input.setAttribute('aria-describedby', error.id)
    const wrap = h('label', { class: 'field', for: input.id },
        h('span', { class: 'field-label' }, label),
        input,
        hint ? h('span', { class: 'field-hint' }, hint) : null,
        error,
    )
    return { wrap, error }
}

function setFieldError(input: HTMLInputElement, error: HTMLElement, text: string): void {
    error.textContent = text
    if (text === '') input.removeAttribute('aria-invalid')
    else input.setAttribute('aria-invalid', 'true')
}

function brand(): HTMLElement {
    return h('div', { class: 'brand' },
        h('p', { class: 'brand-name' }, 'Treino'),
        h('p', { class: 'brand-line' }, 'Anote as séries e veja a carga do próximo treino.'),
    )
}

export function loginScreen(auth: Auth, goSignup: () => void): HTMLElement {
    const email = h('input', { id: 'login-email', type: 'email', autocomplete: 'email', inputmode: 'email', required: true })
    const password = h('input', { id: 'login-pass', type: 'password', autocomplete: 'current-password', required: true })
    const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Entrar')
    const msg = messageBox()

    const form = h('form', { class: 'auth-form', novalidate: true },
        field('E-mail', email).wrap,
        field('Senha', password).wrap,
        msg,
        submit,
    )
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault()
        setMessage(msg, '')
        setBusy(submit, true, 'Entrando…')
        try {
            await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
            // O onAuthStateChanged do main.ts troca a tela.
        } catch (err) {
            setMessage(msg, authErrorMessage(err))
            setBusy(submit, false)
        }
    })

    return h('div', { class: 'screen screen-auth' },
        brand(),
        h('h1', { class: 'auth-title' }, 'Entrar'),
        form,
        h('p', { class: 'auth-switch' }, 'Ainda não tem conta? ',
            h('button', { class: 'link', type: 'button', onclick: goSignup }, 'Criar conta')),
    )
}

export interface SignupFlow {
    /** Chamado antes do createUser: o main.ts não navega enquanto o cadastro não terminar. */
    begin: () => void
    /** O createUser falhou: volta ao comportamento normal. */
    abort: () => void
    /** Cadastro concluído (ou o usuário escolheu continuar): segue para o app. */
    finish: (user: User) => void
}

export function signupScreen(auth: Auth, db: Firestore, flow: SignupFlow, goLogin: () => void): HTMLElement {
    const name = h('input', { id: 'su-name', type: 'text', autocomplete: 'name', maxlength: 60, required: true })
    const email = h('input', { id: 'su-email', type: 'email', autocomplete: 'email', inputmode: 'email', required: true })
    const password = h('input', { id: 'su-pass', type: 'password', autocomplete: 'new-password', minlength: 6, required: true })
    const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Criar conta')
    const msg = messageBox()
    const nameField = field('Nome', name, `De ${NAME_MIN} a ${NAME_MAX} caracteres`)

    const form = h('form', { class: 'auth-form', novalidate: true },
        nameField.wrap,
        field('E-mail', email).wrap,
        field('Senha', password, 'Pelo menos 6 caracteres').wrap,
        msg,
        submit,
    )

    // Depois que a conta existe, um passo que falhou pode ser repetido sem recriar a conta.
    const recovery = h('div', { class: 'recovery', hidden: true })
    const switchLine = h('p', { class: 'auth-switch' }, 'Já tem conta? ',
        h('button', { class: 'link', type: 'button', onclick: goLogin }, 'Entrar'))

    function showRecovery(text: string, retry: () => void, user: User): void {
        form.hidden = true
        switchLine.hidden = true
        recovery.hidden = false
        const retryBtn = h('button', { class: 'btn btn-primary', type: 'button' }, 'Tentar de novo')
        retryBtn.addEventListener('click', () => {
            setBusy(retryBtn, true, 'Tentando…')
            retry()
        })
        recovery.replaceChildren(
            h('p', { class: 'msg msg-error', role: 'alert' }, `Sua conta foi criada, mas um passo falhou: ${text}`),
            retryBtn,
            h('button', { class: 'btn', type: 'button', onclick: () => flow.finish(user) }, 'Continuar mesmo assim'),
        )
    }

    async function saveProfile(user: User, displayName: string): Promise<void> {
        try {
            await updateProfile(user, { displayName })
        } catch (err) {
            showRecovery(authErrorMessage(err), () => void saveProfile(user, displayName), user)
            return
        }
        await saveUserDoc(user, displayName)
    }

    async function saveUserDoc(user: User, displayName: string): Promise<void> {
        const r = await ensureUserDoc(db, user.uid, displayName)
        if (!r.ok) {
            showRecovery(r.message, () => void saveUserDoc(user, displayName), user)
            return
        }
        flow.finish(user)
    }

    form.addEventListener('submit', async (ev) => {
        ev.preventDefault()
        setMessage(msg, '')
        const displayName = name.value.trim()
        if (displayName.length < NAME_MIN || displayName.length > NAME_MAX) {
            setFieldError(name, nameField.error, `O nome precisa ter de ${NAME_MIN} a ${NAME_MAX} caracteres.`)
            name.focus()
            return
        }
        setFieldError(name, nameField.error, '')
        setBusy(submit, true, 'Criando conta…')

        flow.begin()
        let user: User
        try {
            const cred = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value)
            user = cred.user
        } catch (err) {
            flow.abort()
            setMessage(msg, authErrorMessage(err))
            setBusy(submit, false)
            return
        }
        await saveProfile(user, displayName)
    })

    return h('div', { class: 'screen screen-auth' },
        brand(),
        h('h1', { class: 'auth-title' }, 'Criar conta'),
        form,
        recovery,
        switchLine,
    )
}
