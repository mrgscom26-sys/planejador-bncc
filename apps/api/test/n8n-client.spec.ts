import { N8nClient } from '../src/modules/ai/n8n.client';
import {
  N8nRequestSchema,
  N8nSuccessResponseSchema,
  formatSkillsForN8n,
} from '../src/modules/ai/dto/n8n.dto';
import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';

describe('N8nClient Unit Tests (T024 / US3)', () => {
  describe('Contrato e Validação de Esquemas (Zod)', () => {
    it('deve serializar e validar payload de requisição conforme docs/contracts/n8n.md', () => {
      const payload = {
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01 — Organizar objetos físicos ou digitais',
        instrucao: 'Criar uma atividade introdutória em dupla.',
        duracao: 50,
        recursos_digitais: true,
      };

      const result = N8nRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessao).toBe('ana@demo.bncc.br');
        expect(result.data.duracao).toBe(50);
        expect(result.data.recursos_digitais).toBe(true);
      }
    });

    it('deve formatar 1 a 3 habilidades com delimitador de quebra de linha dupla', () => {
      const skills = [
        { codigo: 'EF01CO01', descricao: 'Organizar objetos' },
        { codigo: 'EF01CO02', descricao: 'Identificar padrões' },
      ];

      const formatted = formatSkillsForN8n(skills);
      expect(formatted).toBe('EF01CO01 — Organizar objetos\n\nEF01CO02 — Identificar padrões');
    });

    it('deve rejeitar lista vazia ou com mais de 3 habilidades', () => {
      expect(() => formatSkillsForN8n([])).toThrow('Pelo menos uma habilidade');

      const fourSkills = [
        { codigo: 'H1', descricao: 'D1' },
        { codigo: 'H2', descricao: 'D2' },
        { codigo: 'H3', descricao: 'D3' },
        { codigo: 'H4', descricao: 'D4' },
      ];
      expect(() => formatSkillsForN8n(fourSkills)).toThrow('No máximo 3 habilidades');
    });

    it('deve validar resposta de sucesso estrita (success: true, answer, format: markdown)', () => {
      const validResponse = {
        success: true,
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01 — Organizar objetos',
        answer: '# Plano de Aula\nConteúdo pedagógico gerado.',
        format: 'markdown',
      };

      const result = N8nSuccessResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar resposta malformada ou formato diferente de markdown', () => {
      const invalidResponse = {
        success: true,
        answer: 'Plano sem formato markdown',
        format: 'html', // inválido
      };

      const result = N8nSuccessResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Comportamento do Cliente HTTP e Headers', () => {
    it('deve injetar cabeçalhos x-api-key e x-request-id na chamada real', async () => {
      const originalFetch = global.fetch;
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: any;

      global.fetch = jest.fn().mockImplementation(async (url, init) => {
        capturedHeaders = init.headers;
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            sessao: capturedBody.sessao,
            habilidade: capturedBody.habilidade,
            answer: '# Plano retornado com sucesso',
            format: 'markdown',
          }),
        };
      }) as any;

      const client = new N8nClient({
        webhookUrl: 'http://test-webhook.local',
        apiKey: 'chave-teste-123',
        mockEnabled: false,
        timeoutMs: 5000,
      });

      const response = await client.send(
        {
          sessao: 'ana@demo.bncc.br',
          habilidade: 'EF01CO01 — Habilidade teste',
          instrucao: 'Instrução pedagógica válida',
          duracao: 50,
          recursos_digitais: false,
        },
        'req-uuid-12345',
      );

      expect(response.success).toBe(true);
      expect(capturedHeaders['x-api-key']).toBe('chave-teste-123');
      expect(capturedHeaders['x-request-id']).toBe('req-uuid-12345');
      expect(capturedHeaders['Content-Type']).toBe('application/json');

      global.fetch = originalFetch;
    });

    it('deve abortar e lançar GatewayTimeoutException em caso de timeout', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async (url, init) => {
        // Simula fetch que aborta por timeout
        return new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted due to timeout');
            err.name = 'TimeoutError';
            reject(err);
          });
        });
      }) as any;

      const client = new N8nClient({
        webhookUrl: 'http://test-webhook.local',
        apiKey: 'chave-teste-123',
        mockEnabled: false,
        timeoutMs: 30, // 30ms para disparar rápido no teste
      });

      await expect(
        client.send({
          sessao: 'ana@demo.bncc.br',
          habilidade: 'EF01CO01 — Habilidade teste',
          instrucao: 'Instrução pedagógica válida',
          duracao: 50,
          recursos_digitais: false,
        }),
      ).rejects.toThrow(GatewayTimeoutException);

      global.fetch = originalFetch;
    });

    it('deve lançar BadGatewayException sem retentativa automática em status HTTP 500', async () => {
      const originalFetch = global.fetch;
      let callCount = 0;

      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        return {
          ok: false,
          status: 500,
        };
      }) as any;

      const client = new N8nClient({
        webhookUrl: 'http://test-webhook.local',
        apiKey: 'chave-teste-123',
        mockEnabled: false,
        timeoutMs: 5000,
      });

      await expect(
        client.send({
          sessao: 'ana@demo.bncc.br',
          habilidade: 'EF01CO01 — Habilidade teste',
          instrucao: 'Instrução pedagógica válida',
          duracao: 50,
          recursos_digitais: false,
        }),
      ).rejects.toThrow(BadGatewayException);

      // Garante que não houve retentativa automática
      expect(callCount).toBe(1);

      global.fetch = originalFetch;
    });
  });
});
