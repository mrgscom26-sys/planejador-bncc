import { Injectable, Optional, BadGatewayException, GatewayTimeoutException, HttpException } from '@nestjs/common';
import * as crypto from 'crypto';
import { env } from '../../config/env.config';
import { N8nRequest, N8nRequestSchema, N8nSuccessResponse, N8nSuccessResponseSchema } from './dto/n8n.dto';

export interface N8nClientOptions {
  webhookUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  mockEnabled?: boolean;
}

@Injectable()
export class N8nClient {
  private webhookUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private mockEnabled: boolean;

  constructor(@Optional() options?: N8nClientOptions) {
    this.webhookUrl = options?.webhookUrl ?? env.N8N_WEBHOOK_URL;
    this.apiKey = options?.apiKey ?? env.N8N_API_KEY;
    this.timeoutMs = options?.timeoutMs ?? env.N8N_TIMEOUT_MS ?? 45000;
    this.mockEnabled = options?.mockEnabled ?? env.N8N_MOCK_ENABLED ?? false;
  }

  async send(rawPayload: N8nRequest, requestId?: string): Promise<N8nSuccessResponse> {
    const validatedPayload = N8nRequestSchema.parse(rawPayload);
    const resolvedRequestId = requestId || crypto.randomUUID();

    if (this.mockEnabled) {
      return this.handleMock(validatedPayload);
    }

    try {
      const signal = AbortSignal.timeout(this.timeoutMs);
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'x-request-id': resolvedRequestId,
        },
        body: JSON.stringify(validatedPayload),
        signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(`Provedor n8n retornou status HTTP ${response.status}.`);
      }

      const rawJson = await response.json();
      const parseResult = N8nSuccessResponseSchema.safeParse(rawJson);

      if (!parseResult.success) {
        throw new BadGatewayException(
          `Resposta do provedor n8n viola o contrato esperado: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
        );
      }

      return parseResult.data;
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new GatewayTimeoutException('Tempo de execução da IA excedeu o limite estrito de 45 segundos.');
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadGatewayException(`Falha de comunicação com o serviço n8n: ${error.message}`);
    }
  }

  private async handleMock(payload: N8nRequest): Promise<N8nSuccessResponse> {
    if (payload.instrucao.includes('[MOCK_ERROR]')) {
      throw new BadGatewayException('Falha simulada no provedor de IA (MOCK_ERROR).');
    }

    if (payload.instrucao.includes('[MOCK_TIMEOUT]')) {
      // Simula aborto estrito de timeout
      const shortTimeoutSignal = AbortSignal.timeout(20);
      try {
        await new Promise((_, reject) => {
          shortTimeoutSignal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted due to timeout');
            err.name = 'TimeoutError';
            reject(err);
          });
        });
      } catch (err: any) {
        throw new GatewayTimeoutException('Tempo de execução da IA excedeu o limite estrito de 45 segundos.');
      }
    }

    // Pequena latência para simular I/O assíncrono
    await new Promise((resolve) => setTimeout(resolve, 20));

    return N8nSuccessResponseSchema.parse({
      success: true,
      sessao: payload.sessao,
      habilidade: payload.habilidade,
      answer: `# Plano de Aula: ${payload.habilidade.split('—')[0]?.trim() || 'BNCC'}\n\n## Objetivos Pedagógicos\n- Explorar e desenvolver as competências previstas de forma ativa e colaborativa.\n\n## Metodologia e Dinâmica\n${payload.instrucao}\n\n## Duração Estimada\n${payload.duracao} minutos.\n\n## Recursos Didáticos\n${payload.recursos_digitais ? 'Ambiente com tecnologias digitais e mídias interativas.' : 'Recursos físicos convencionais.'}`,
      format: 'markdown',
    });
  }
}
