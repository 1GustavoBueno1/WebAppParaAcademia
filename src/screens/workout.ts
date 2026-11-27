import type { ExerciseState, Plan, PlanDay, PlanExercise } from '../domain/types.ts'
import { MAX_NOTE_LENGTH, todayLocal } from '../domain/validation.ts'
import { loadExerciseStates } from '../data/reads.ts'
import { saveWorkout } from '../data/workouts.ts'
import { append, h, messageBox, setBusy, setMessage, toast } from '../ui/dom.ts'
import { formatDateShort, formatSet, formatSuggestion, formatTarget } from '../ui/format.ts'
import { buildWorkout, type ExerciseInput, type FieldError } from '../ui/workoutForm.ts'
import { loadError, loading, shell, type AppDeps } from './shell.ts'

const MAX_ROWS = 20

interface Row {
    el: HTMLElement
    reps: HTMLInputElement
    load: HTMLInputElement
    rir: HTMLInputElement
    done: HTMLButtonElement
}

interface Block {
    el: HTMLElement
    exercise: PlanExercise
    rows: Row[]
    list: HTMLElement
    error: HTMLElement
    add: HTMLButtonElement
    remove: HTMLButtonElement
}

export interface WorkoutNav {
    back: () => void
    saved: () => void
}

function isDone(row: Row): boolean {
    return row.done.getAttribute('aria-pressed') === 'true'
}

function setDone(row: Row, done: boolean): void {
    row.done.setAttribute('aria-pressed', String(done))
    row.el.classList.toggle('is-done', done)
}

function clearInvalid(input: HTMLInputElement): void {
    input.removeAttribute('aria-invalid')
}

export function workoutScreen(deps: AppDeps, plan: Plan, day: PlanDay, nav: WorkoutNav): HTMLElement {
    const body = h('div', { class: 'stack' }, loading())
    let blocks: Block[] = []
    let note: HTMLTextAreaElement | null = null

    const dirty = (): boolean =>
        blocks.some(b => b.rows.some(isDone)) || (note !== null && note.value.trim() !== '')
    const confirmLeave = (): boolean =>
        !dirty() || window.confirm('Sair sem salvar? As séries marcadas serão perdidas.')

    async function load(): Promise<void> {
        body.replaceChildren(loading())
        const r = await loadExerciseStates(deps.db, deps.user.uid)
        if (!deps.isCurrent()) return
        if (!r.ok) {
            body.replaceChildren(loadError(r.message, () => void load()))
            return
        }
        renderForm(r.data)
    }

    function renderForm(states: Map<string, ExerciseState>): void {
        const today = todayLocal()
        const date = h('input', { id: 'wk-date', type: 'date', value: today, max: today, required: true })
        date.addEventListener('input', () => clearInvalid(date))
        note = h('textarea', { id: 'wk-note', rows: 3, maxlength: MAX_NOTE_LENGTH, placeholder: 'Como foi o treino? (opcional)' })

        blocks = day.exercises.map(ex => exerciseBlock(ex, states.get(ex.exerciseId), today))

        const msg = messageBox()
        const save = h('button', { class: 'btn btn-primary btn-save', type: 'button' }, 'Salvar treino')
        save.addEventListener('click', () => void submit(date, msg, save))

        body.replaceChildren(
            h('label', { class: 'field field-date', for: date.id },
                h('span', { class: 'field-label' }, 'Data do treino'), date),
            ...blocks.map(b => b.el),
            h('label', { class: 'field', for: note.id },
                h('span', { class: 'field-label' }, 'Observação'), note),
            h('div', { class: 'savebar' }, msg, save),
        )
    }

    function exerciseBlock(ex: PlanExercise, state: ExerciseState | undefined, today: string): Block {
        const unit = ex.unit ?? 'reps'
        const list = h('div', { class: 'sets', role: 'group', 'aria-label': `Séries de ${ex.name}` },
            h('div', { class: 'sets-head', 'aria-hidden': 'true' },
                h('span', {}, 'Série'),
                h('span', {}, unit === 'seconds' ? 'Seg' : 'Reps'),
                h('span', {}, 'kg'),
                h('span', {}, 'RIR'),
                h('span', {}, 'Feita'),
            ),
        )
        const error = h('p', { class: 'msg msg-error', role: 'alert' })
        const add = h('button', { class: 'btn btn-small', type: 'button' }, '+ Série')
        const remove = h('button', { class: 'btn btn-small', type: 'button' }, '− Série')
        const el = h('section', { class: 'ex' })
        const block: Block = { el, exercise: ex, rows: [], list, error, add, remove }

        const initialReps = String(state ? state.suggestedReps : ex.repMin)
        // Sem sugestão de carga: exercício em segundos (prancha) começa com 0 kg; os outros, vazio.
        const initialLoad = state && state.suggestedLoadKg !== null
            ? String(state.suggestedLoadKg).replace('.', ',')
            : unit === 'seconds' ? '0' : ''

        const syncButtons = (): void => {
            add.disabled = block.rows.length >= MAX_ROWS
            remove.disabled = block.rows.length <= 1
        }
        const addRow = (reps: string, load: string): void => {
            const row = setRow(ex, block.rows.length + 1, reps, load)
            block.rows.push(row)
            list.append(row.el)
            syncButtons()
        }
        add.addEventListener('click', () => {
            const last = block.rows[block.rows.length - 1]
            addRow(last ? last.reps.value : initialReps, last ? last.load.value : initialLoad)
        })
        remove.addEventListener('click', () => {
            const last = block.rows.pop()
            last?.el.remove()
            syncButtons()
        })
        for (let i = 0; i < ex.sets; i++) addRow(initialReps, initialLoad)

        const suggestion = state ? formatSuggestion(state, unit) : 'Primeiro treino'
        const last = state
            ? `${formatDateShort(state.lastDate, today)}: ${state.lastSets.map(s => formatSet(s, unit)).join(', ')}`
            : null

        append(el, [
            h('div', { class: 'ex-head' },
                h('h2', { class: 'ex-name' }, ex.name),
                h('span', { class: 'ex-target num' }, formatTarget(ex)),
            ),
            h('dl', { class: 'ex-info' },
                h('div', { class: 'ex-suggest' }, h('dt', {}, 'Sugestão'), h('dd', { class: 'num' }, suggestion)),
                last ? h('div', {}, h('dt', {}, 'Última vez'), h('dd', { class: 'num' }, last)) : null,
            ),
            ex.notes ? h('p', { class: 'ex-notes' }, ex.notes) : null,
            list,
            h('div', { class: 'ex-actions' }, remove, add),
            error,
        ])
        return block
    }

    function setRow(ex: PlanExercise, n: number, reps: string, load: string): Row {
        const repsLabel = ex.unit === 'seconds' ? 'segundos' : 'repetições'
        const mk = (cls: string, mode: 'numeric' | 'decimal', value: string, label: string, placeholder?: string) => {
            const input = h('input', {
                class: `set-in ${cls}`, type: 'text', inputmode: mode, autocomplete: 'off',
                enterkeyhint: 'next', value, placeholder, 'aria-label': `Série ${n}, ${label}`,
            })
            input.addEventListener('input', () => clearInvalid(input))
            return input
        }
        const repsIn = mk('set-reps', 'numeric', reps, repsLabel)
        const loadIn = mk('set-load', 'decimal', load, 'carga em kg')
        const rirIn = mk('set-rir', 'numeric', '', 'RIR, opcional', String(ex.targetRir))
        const done = h('button', { class: 'set-done', type: 'button', 'aria-pressed': 'false', 'aria-label': `Série ${n} feita` }, '✓')
        const el = h('div', { class: 'set' }, h('span', { class: 'set-n num' }, String(n)), repsIn, loadIn, rirIn, done)
        const row: Row = { el, reps: repsIn, load: loadIn, rir: rirIn, done }
        done.addEventListener('click', () => setDone(row, !isDone(row)))
        return row
    }

    function showErrors(errors: FieldError[]): void {
        let first: HTMLInputElement | null = null
        for (const [bi, b] of blocks.entries()) {
            const mine = errors.filter(e => e.exerciseIndex === bi)
            setMessage(b.error, mine.map(e => `Série ${e.rowIndex + 1}: ${e.message}`).join(' '))
            for (const e of mine) {
                const row = b.rows[e.rowIndex]
                if (row === undefined) continue
                const input = e.field === 'reps' ? row.reps : e.field === 'load' ? row.load : row.rir
                input.setAttribute('aria-invalid', 'true')
                first ??= input
            }
        }
        first?.focus()
    }

    async function submit(date: HTMLInputElement, msg: HTMLElement, save: HTMLButtonElement): Promise<void> {
        setMessage(msg, '')
        clearInvalid(date)
        const exercises: ExerciseInput[] = blocks.map(b => ({
            exercise: b.exercise,
            rows: b.rows.map(r => ({ reps: r.reps.value, load: r.load.value, rir: r.rir.value, done: isDone(r) })),
        }))
        const built = buildWorkout({
            date: date.value, today: todayLocal(), planDayId: day.id, note: note?.value ?? '', exercises,
        })
        if (!built.ok) {
            showErrors(built.fieldErrors)
            if (built.dateError) date.setAttribute('aria-invalid', 'true')
            setMessage(msg, built.message)
            return
        }
        showErrors([])

        setBusy(save, true, 'Salvando…')
        const r = await saveWorkout(deps.db, deps.user.uid, built.workout, day.exercises)
        if (!deps.isCurrent()) return
        if (!r.ok) {
            // Mantém tudo o que foi digitado; o botão volta para tentar de novo.
            setMessage(msg, r.message)
            setBusy(save, false)
            return
        }
        toast('Treino salvo')
        nav.saved()
    }

    void load()
    return shell(deps, {
        title: day.name,
        back: { label: `Voltar para ${plan.name}`, onClick: () => { if (confirmLeave()) nav.back() } },
        confirmLeave,
    }, body)
}
