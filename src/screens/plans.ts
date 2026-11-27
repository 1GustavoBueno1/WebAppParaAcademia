import type { Plan, PlanDay } from '../domain/types.ts'
import { h } from '../ui/dom.ts'
import { formatTarget } from '../ui/format.ts'
import { shell, type AppDeps } from './shell.ts'

/** Mais de um plano: lista para escolher (não existe plano ativo). */
export function planListScreen(deps: AppDeps, plans: Map<string, Plan>, onPick: (planId: string) => void): HTMLElement {
    const items = [...plans].map(([id, p]) =>
        h('button', { class: 'pick', type: 'button', onclick: () => onPick(id) },
            h('span', { class: 'pick-title' }, p.name),
            h('span', { class: 'pick-sub' }, p.days.map(d => d.name).join(', ')),
        ),
    )
    return shell(deps, { title: 'Seus planos' },
        h('div', { class: 'stack' }, h('p', { class: 'lead' }, 'Qual plano você vai treinar?'), ...items),
    )
}

export interface PlanScreenNav {
    /** Só existe quando há mais de um plano. */
    back?: () => void
    openDay: (day: PlanDay) => void
}

/** Os dias do plano. Tocar em um dia abre o registro de treino. */
export function planScreen(deps: AppDeps, plan: Plan, nav: PlanScreenNav): HTMLElement {
    const days = plan.days.map(day =>
        h('button', { class: 'pick pick-day', type: 'button', onclick: () => nav.openDay(day) },
            h('span', { class: 'pick-title' }, day.name),
            h('span', { class: 'pick-list' },
                ...day.exercises.map(ex =>
                    h('span', { class: 'pick-row' },
                        h('span', {}, ex.name),
                        h('span', { class: 'num' }, formatTarget(ex)),
                    ),
                ),
            ),
            h('span', { class: 'pick-cta' }, 'Registrar treino'),
        ),
    )
    return shell(deps,
        { title: plan.name, back: nav.back ? { label: 'Voltar para os planos', onClick: nav.back } : undefined },
        h('div', { class: 'stack' }, ...days),
    )
}
