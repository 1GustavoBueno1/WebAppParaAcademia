const MESSAGES = new Map<string, string>([
    ['permission-denied', 'Você não tem permissão para salvar esses dados.'],
    ['unauthenticated', 'Sua sessão expirou. Entre de novo.'],
    ['unavailable', 'Sem conexão com o servidor. Verifique a internet e tente de novo.'],
    ['deadline-exceeded', 'O servidor demorou a responder. Tente de novo.'],
    ['aborted', 'Os dados mudaram enquanto você salvava. Tente de novo.'],
    ['resource-exhausted', 'Limite de uso atingido. Tente mais tarde.'],
    ['invalid-argument', 'Dados inválidos. Revise o treino e tente de novo.'],
])

const DEFAULT_MESSAGE = 'Não foi possível salvar. Tente de novo.'

export function firestoreErrorMessage(err: unknown): string {
    if (typeof err !== 'object' || err === null) return DEFAULT_MESSAGE
    if (!('code' in err) || typeof err.code !== 'string') return DEFAULT_MESSAGE
    return MESSAGES.get(err.code) ?? DEFAULT_MESSAGE
}