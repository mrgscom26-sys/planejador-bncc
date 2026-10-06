import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GeneratePlanRequest, UpdatePlanRequest } from './dto/plans.dto';
import { PlanSummary, PlanDetail, UserResponse } from '@planejador-bncc/shared-types';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async generatePlan(user: UserResponse, dto: GeneratePlanRequest): Promise<PlanDetail> {
    // 1. Validar e recuperar as habilidades solicitadas
    if (!dto.skillIds || dto.skillIds.length < 1 || dto.skillIds.length > 3) {
      throw new BadRequestException('Selecione entre 1 e 3 habilidades da BNCC.');
    }

    const skills = await this.prisma.bnccSkill.findMany({
      where: {
        id: { in: dto.skillIds },
      },
    });

    if (skills.length !== dto.skillIds.length) {
      throw new BadRequestException('Uma ou mais habilidades informadas não foram encontradas no catálogo.');
    }

    // Preservar a ordem exata selecionada pelo docente
    const orderedSkills = dto.skillIds.map((id) => skills.find((s) => s.id === id)!);

    // 2. Executar ciclo da IA com controle do registro AiRun
    const aiResult = await this.aiService.executeAiRun({
      userId: user.id,
      userEmail: user.email,
      skills: orderedSkills,
      instructionalGoal: dto.instructionalGoal,
      durationMinutes: dto.durationMinutes,
      useDigitalResources: dto.useDigitalResources,
    });

    // 3. Transação atômica: cria o plano e atualiza AiRun para SUCCEEDED
    const createdPlan = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          userId: user.id,
          title: dto.title,
          instructionalGoal: dto.instructionalGoal,
          durationMinutes: dto.durationMinutes,
          useDigitalResources: dto.useDigitalResources,
          status: 'RASCUNHO',
          markdownContent: aiResult.response.answer,
          aiAssisted: true,
          aiRunId: aiResult.aiRunId,
          skills: {
            create: orderedSkills.map((s, index) => ({
              skillId: s.id,
              orderIndex: index + 1,
            })),
          },
        },
        include: {
          skills: {
            include: { skill: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      await tx.aiRun.update({
        where: { id: aiResult.aiRunId },
        data: {
          status: 'SUCCEEDED',
          rawResponse: aiResult.response as any,
          latencyMs: aiResult.latencyMs,
        },
      });

      return plan;
    });

    return this.mapToPlanDetail(createdPlan);
  }

  async listPlans(userId: string, query?: string): Promise<PlanSummary[]> {
    const where: any = { userId };

    if (query && query.trim()) {
      where.title = { contains: query.trim(), mode: 'insensitive' };
    }

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        skills: {
          include: { skill: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return plans.map((p) => this.mapToPlanSummary(p));
  }

  async getPlanById(userId: string, planId: string): Promise<PlanDetail> {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: planId,
        userId,
      },
      include: {
        skills: {
          include: { skill: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado.');
    }

    return this.mapToPlanDetail(plan);
  }

  async updatePlan(
    userId: string,
    planId: string,
    data: UpdatePlanRequest,
  ): Promise<PlanDetail> {
    const existing = await this.prisma.plan.findFirst({
      where: {
        id: planId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Plano não encontrado.');
    }

    const updated = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        title: data.title,
        markdownContent: data.markdownContent,
      },
      include: {
        skills: {
          include: { skill: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return this.mapToPlanDetail(updated);
  }

  private mapToPlanSummary(plan: any): PlanSummary {
    return {
      id: plan.id,
      title: plan.title,
      durationMinutes: plan.durationMinutes,
      status: plan.status,
      aiAssisted: plan.aiAssisted,
      updatedAt: plan.updatedAt instanceof Date ? plan.updatedAt.toISOString() : plan.updatedAt,
      skills: plan.skills.map((ps: any) => ({
        codigo: ps.skill.codigo,
        descricao: ps.skill.descricao,
      })),
    };
  }

  private mapToPlanDetail(plan: any): PlanDetail {
    return {
      id: plan.id,
      title: plan.title,
      instructionalGoal: plan.instructionalGoal,
      durationMinutes: plan.durationMinutes,
      useDigitalResources: plan.useDigitalResources,
      status: plan.status,
      markdownContent: plan.markdownContent,
      aiAssisted: plan.aiAssisted,
      createdAt: plan.createdAt instanceof Date ? plan.createdAt.toISOString() : plan.createdAt,
      updatedAt: plan.updatedAt instanceof Date ? plan.updatedAt.toISOString() : plan.updatedAt,
      skills: plan.skills.map((ps: any) => ps.skill),
    };
  }
}
