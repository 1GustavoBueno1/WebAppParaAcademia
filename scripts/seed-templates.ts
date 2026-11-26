import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { isRecord } from '../src/domain/validation.ts'
import { parsePlan } from '../src/domain/workoutDoc.ts'
import { validatePlan } from '../src/domain/validation.ts'
import type { Plan } from '../src/domain/types.ts'
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
