import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { N8nClient } from './n8n.client';
import { formatSkillsForN8n, N8nRequest, N8nSuccessResponse } from './dto/n8n.dto';

export interface ExecuteAiRunParams {
  userId: string;
  userEmail: string;
  skills: { codigo: string; descricao: string }[];
  instructionalGoal: string;
  durationMinutes: number;
  useDigitalResources: boolean;
}

export interface AiRunExecutionResult {
  aiRunId: string;
  requestId: string;
  response: N8nSuccessResponse;
  latencyMs: number;
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nClient: N8nClient,
  ) {}

  async executeAiRun(params: ExecuteAiRunParams): Promise<AiRunExecutionResult> {
    const requestId = crypto.randomUUID();
    const formattedSkills = formatSkillsForN8n(params.skills);

    const promptPayload: N8nRequest = {
      sessao: params.userEmail,
      habilidade: formattedSkills,
      instrucao: params.instructionalGoal,
      duracao: params.durationMinutes,
      recursos_digitais: params.useDigitalResources,
    };

    // 1. Criar registro de auditoria com status PENDING
    const aiRun = await this.prisma.aiRun.create({
      data: {
        userId: params.userId,
        requestId,
        promptPayload: promptPayload as any,
        status: 'PENDING',
      },
    });

    const startTime = Date.now();

    try {
      // 2. Chamar o webhook n8n com cabeçalhos e timeout estrito de 45s
      const response = await this.n8nClient.send(promptPayload, requestId);
      const latencyMs = Date.now() - startTime;

      return {
        aiRunId: aiRun.id,
        requestId,
        response,
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;

      // 3. Atualizar status para FAILED no banco garantindo rastreabilidade
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Erro inesperado na execução do modelo de IA',
          latencyMs,
        },
      });

      throw error;
    }
  }
}
