import type { Plan } from '../domain/types.ts'
import { loadTemplates } from '../data/reads.ts'
import { createPlanFromTemplate } from '../data/plans.ts'
import { h, messageBox, setBusy, setMessage } from '../ui/dom.ts'
import { loadError, loading, shell, type AppDeps } from './shell.ts'

/** Usuário sem plano: escolhe um modelo. `onCreated` recarrega os planos e navega. */
export function templatesScreen(deps: AppDeps, onCreated: () => void): HTMLElement {
    const body = h('div', { class: 'stack' }, loading('Carregando modelos…'))

    async function load(): Promise<void> {
        body.replaceChildren(loading('Carregando modelos…'))
        const r = await loadTemplates(deps.db)
        if (!deps.isCurrent()) return
        if (!r.ok) {
            body.replaceChildren(loadError(r.message, () => void load()))
            return
        }
        if (r.data.size === 0) {
            body.replaceChildren(
                h('div', { class: 'state' },
                    h('p', { class: 'state-title' }, 'Nenhum modelo disponível'),
                    h('p', { class: 'muted' }, 'Os modelos de treino ainda não foram cadastrados.'),
                    h('button', { class: 'btn', type: 'button', onclick: () => void load() }, 'Carregar de novo'),
                ),
            )
            return
        }
        const buttons: HTMLButtonElement[] = []
        const cards = [...r.data].map(([id, t]) => templateItem(id, t, buttons))
        body.replaceChildren(
            h('p', { class: 'lead' }, 'Escolha um modelo para começar. Ele vira o seu plano de treino.'),
            ...cards,
        )
    }

    function templateItem(templateId: string, template: Plan, all: HTMLButtonElement[]): HTMLElement {
        const msg = messageBox()
        const choose = h('button', { class: 'btn btn-primary', type: 'button' }, 'Usar este modelo')
        all.push(choose)
        choose.addEventListener('click', async () => {
            setMessage(msg, '')
            for (const b of all) b.disabled = true
            setBusy(choose, true, 'Criando plano…')
            const r = await createPlanFromTemplate(deps.db, deps.user.uid, templateId, template)
            if (!deps.isCurrent()) return
            if (!r.ok) {
                setMessage(msg, r.message)
                setBusy(choose, false)
                for (const b of all) b.disabled = false
                return
            }
            onCreated()
        })
        const days = template.days.length
        return h('section', { class: 'item' },
            h('h2', { class: 'item-title' }, template.name),
            h('p', { class: 'muted' }, `${days} ${days === 1 ? 'dia' : 'dias'} de treino`),
            h('ol', { class: 'day-names' }, ...template.days.map(d => h('li', {}, d.name))),
            msg,
            choose,
        )
    }

    void load()
    return shell(deps, { title: 'Escolha um modelo' }, body)
}
