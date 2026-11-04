const MENSAGENS: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Esse e-mail não é válido.",
  "auth/user-disabled": "Esta conta foi desativada. Fale com o suporte.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail. Tente entrar.",
  "auth/weak-password": "Senha fraca: use pelo menos 8 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
  "auth/operation-not-allowed": "Login por e-mail ainda não está ativado no servidor.",
  "auth/configuration-not-found": "O login ainda não foi ativado no Firebase deste projeto.",
  "permission-denied": "Você não tem permissão para essa ação.",
};

export function mensagemErro(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? "";
  return MENSAGENS[codigo] ?? "Algo deu errado. Tente novamente.";
}

/** Para fluxos que misturam Firebase e rotas de IA: as rotas já devolvem a mensagem pronta em português. */
export function mensagemFluxo(e: unknown): string {
  const erro = e as { code?: string; message?: string };
  return erro?.code || !erro?.message ? mensagemErro(e) : erro.message;
}
