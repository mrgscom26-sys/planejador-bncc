export interface N8nWebhookPayload {
  sessao: string;
  habilidade: string;
  instrucao: string;
  duracao: number;
  recursos_digitais: boolean;
}

export interface N8nWebhookSuccessResponse {
  success: true;
  answer: string;
  format: 'markdown';
}
