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



