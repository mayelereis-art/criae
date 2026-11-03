/** Contrato do gateway. Outro provedor = outro adaptador implementando estas funções. */

export type ItemCobranca = { id: string; titulo: string; precoCentavos: number };

export type StatusGateway = "aprovado" | "pendente" | "recusado" | "reembolsado" | "contestado" | "cancelado";

export type PagamentoGateway = {
  id: string;
  referencia: string | null;
  status: StatusGateway;
  statusOriginal: string;
  metodo: string | null;
  valorCentavos: number;
};

export interface Gateway {
  urlAutorizacao(estado: string): string;
  trocarCodigo(codigo: string): Promise<Credenciais>;
  renovar(refreshToken: string): Promise<Credenciais>;
  criarCobranca(token: string, c: {
    referencia: string; itens: ItemCobranca[]; comprador: { nome: string; email: string };
    urlRetorno: string;
  }): Promise<{ urlPagamento: string }>;
  consultarPagamento(token: string, id: string): Promise<PagamentoGateway | null>;
  reembolsar(token: string, id: string, chaveIdempotencia: string): Promise<void>;
  validarAssinatura(c: { assinatura: string | null; requestId: string | null; idDado: string | null }): boolean;
}

export type Credenciais = { accessToken: string; refreshToken: string; contaId: string; expiraEm: number };

export class ErroGateway extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}
