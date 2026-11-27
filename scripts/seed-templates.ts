import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { isRecord } from '../src/domain/validation.ts'
import { parsePlan } from '../src/domain/workoutDoc.ts'
import { validatePlan } from '../src/domain/validation.ts'
import type { TemplateDoc } from '../src/domain/types.ts'


const ARQUIVO = 'scripts/templates.json'
const EMULATOR_PROJECT_ID = 'demo-webapp-academia'


function idInvalido(id: string): string | null {
    if (id.length === 0 || id.length > 100) return 'O id deve ter entre 1 a 100 caracteres'
    if (id.includes('/')) return 'o Id não pode conter /'
    if (id === '.' || id === '..') return ' o id nao pode ser . ou ..'
    if (/^__.*__$/.test(id)) return 'o ID não pode começar e terminar com "__"'
    return null
}

function lerTemplates(): Map<string, TemplateDoc> {
    let bruto: unknown
    try {
        bruto = JSON.parse(readFileSync(ARQUIVO, 'utf8'))
    } catch (err) {
        throw new Error(`Não foi possivel ler ${ARQUIVO}`)
    }
    if (!isRecord(bruto)) throw new Error(`${ARQUIVO} deve ser um objeto`)
    const entradas = Object.entries(bruto)
    if (entradas.length === 0) throw new Error(`${ARQUIVO} não tem nenhum template`)
    const falhas: string[] = []

    const templates = new Map<string, TemplateDoc>()

    for (const [id, raw] of entradas) {
        const erroId = idInvalido(id)
        if (erroId !== null) {
            falhas.push(`"${id}": ${erroId}`)
            continue
        }
        const plan = parsePlan(raw)
        if (plan === null) {
            falhas.push(`"${id}": formato inválido (parsePlan recusou)`)
            continue
        }
        const erros = validatePlan(plan)
        if (erros.length > 0) {
            falhas.push(`"${id}": ${erros.join('; ')}`)
            continue
        }
        templates.set(id, { name: plan.name, days: plan.days })
    }

    if (falhas.length > 0) {
        throw new Error(`${falhas.length} template(s) inválido(s), nada foi gravado:\n  - ${falhas.join('\n  - ')}`)
    }
    return templates
}


function resumo(templates: Map<string, TemplateDoc>): void {
    for (const [id, t] of templates) {
        const exercicios = t.days.reduce((n, d) => n + d.exercises.length, 0)
        console.log(`  ${id}: "${t.name}" — ${t.days.length} dia(s), ${exercicios} exercício(s)`)
    }
}

async function main(): Promise<void> {
    const dryRun = process.argv.includes('--dry-run')
    const prod = process.argv.includes('--prod')
    const emulador = process.env.FIRESTORE_EMULATOR_HOST

    const templates = lerTemplates()
    console.log(`${templates.size} template(s) válido(s):`)
    resumo(templates)

    if (dryRun) {
        console.log('\n--dry-run: nada foi gravado.')
        return
    }
    if (prod && emulador) {
        throw new Error(`--prod com FIRESTORE_EMULATOR_HOST=${emulador} definido. Feche o terminal ou rode: Remove-Item Env:FIRESTORE_EMULATOR_HOST`)
    }
    if (prod && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('--prod exige GOOGLE_APPLICATION_CREDENTIALS apontando para a chave da conta de serviço')
    }
    if (emulador) {
        console.log(`\nDestino: EMULADOR (${emulador}), projeto ${EMULATOR_PROJECT_ID}`)
        initializeApp({ projectId: EMULATOR_PROJECT_ID })
    } else {
        console.log('\nDestino: PRODUÇÃO')
        initializeApp()
    }
    const db = getFirestore()
    const batch = db.batch()
    for (const [id, t] of templates) {
        batch.set(db.collection('templates').doc(id), t)
    }
    await batch.commit()
    console.log(`${templates.size} template(s) gravado(s) em templates/.`)
}

main().catch((err: unknown) => {
    console.error(`\nERRO: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
})
