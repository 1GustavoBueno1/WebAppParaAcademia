// Helper mínimo para montar elementos. Listeners ficam presos ao elemento,
// então somem junto com a tela quando o main.ts troca o conteúdo de #app.

type AttrValue = string | number | boolean | undefined | ((ev: Event) => void)
export type Attrs = Record<string, AttrValue>
export type Child = Node | string | null | undefined | false

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag)
    for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === false) continue
        if (typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value)
        } else if (key === 'class') {
            el.className = String(value)
        } else {
            el.setAttribute(key, value === true ? '' : String(value))
        }
    }
    append(el, children)
    return el
}

export function append(el: Element, children: Child[]): void {
    for (const c of children) {
        if (c === null || c === undefined || c === false) continue
        el.append(c)
    }
}

/** Caixa de mensagem (erro ou aviso). Vazia some pelo CSS. */
export function messageBox(kind: 'error' | 'info' = 'error'): HTMLParagraphElement {
    return h('p', { class: `msg msg-${kind}`, role: kind === 'error' ? 'alert' : 'status' })
}

export function setMessage(box: HTMLElement, text: string): void {
    box.textContent = text
}

/** Botão que grava: desabilita enquanto a operação roda e troca o rótulo. */
export function setBusy(button: HTMLButtonElement, busy: boolean, busyLabel?: string): void {
    if (busy) {
        button.dataset.label = button.textContent ?? ''
        if (busyLabel !== undefined) button.textContent = busyLabel
        button.disabled = true
        button.setAttribute('aria-busy', 'true')
    } else {
        if (button.dataset.label !== undefined) button.textContent = button.dataset.label
        button.disabled = false
        button.removeAttribute('aria-busy')
    }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export function toast(text: string): void {
    const el = document.getElementById('toast')
    if (el === null) return
    el.textContent = text
    el.classList.add('show')
    if (toastTimer !== undefined) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600)
}
