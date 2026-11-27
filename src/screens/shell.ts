import type { Firestore } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { h, type Child } from '../ui/dom.ts'

/** O que toda tela logada recebe do main.ts. */
export interface AppDeps {
    db: Firestore
    user: User
    /** false depois que o usuário saiu desta tela: resultados async atrasados são ignorados. */
    isCurrent: () => boolean
    /** Sai da conta. `confirmLeave` pode cancelar (ex.: treino não salvo). */
    signOut: (confirmLeave?: () => boolean) => void
}

export interface ShellOptions {
    title: string
    back?: { label: string; onClick: () => void }
    confirmLeave?: () => boolean
}

export function shell(deps: AppDeps, opts: ShellOptions, ...content: Child[]): HTMLElement {
    const back = opts.back
    return h('div', { class: 'screen' },
        h('header', { class: 'bar' },
            back
                ? h('button', { class: 'bar-back', type: 'button', 'aria-label': back.label, onclick: back.onClick }, '‹')
                : null,
            h('h1', { class: 'bar-title' }, opts.title),
            h('button', { class: 'bar-out', type: 'button', onclick: () => deps.signOut(opts.confirmLeave) }, 'Sair'),
        ),
        h('main', { class: 'content' }, ...content),
    )
}

/** Mensagem de falha ao carregar, com botão de tentar de novo. */
export function loadError(message: string, retry: () => void): HTMLElement {
    return h('div', { class: 'state' },
        h('p', { class: 'msg msg-error', role: 'alert' }, message),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: retry }, 'Tentar de novo'),
    )
}

export function loading(text = 'Carregando…'): HTMLElement {
    return h('p', { class: 'state state-loading', role: 'status' }, text)
}
