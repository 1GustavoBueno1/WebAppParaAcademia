// Mensagens do Firebase Auth em português, prontas para mostrar.
const MESSAGES = new Map<string, string>([
    ['auth/email-already-in-use', 'Já existe uma conta com este e-mail. Entre com ela ou use outro e-mail.'],
    ['auth/weak-password', 'Senha fraca. Use pelo menos 6 caracteres.'],
    ['auth/missing-password', 'Informe a senha.'],
    ['auth/invalid-email', 'E-mail inválido. Confira o endereço.'],
    ['auth/missing-email', 'Informe o e-mail.'],
    ['auth/invalid-credential', 'E-mail ou senha incorretos.'],
    ['auth/wrong-password', 'E-mail ou senha incorretos.'],
    ['auth/user-not-found', 'E-mail ou senha incorretos.'],
    ['auth/user-disabled', 'Esta conta foi desativada.'],
    ['auth/too-many-requests', 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'],
    ['auth/network-request-failed', 'Sem conexão. Verifique a internet e tente de novo.'],
    ['auth/operation-not-allowed', 'Login com e-mail e senha não está ativado no projeto.'],
])

const DEFAULT_MESSAGE = 'Não foi possível concluir. Tente de novo.'

export function authErrorMessage(err: unknown): string {
    if (typeof err !== 'object' || err === null) return DEFAULT_MESSAGE
    if (!('code' in err) || typeof err.code !== 'string') return DEFAULT_MESSAGE
    return MESSAGES.get(err.code) ?? DEFAULT_MESSAGE
}
