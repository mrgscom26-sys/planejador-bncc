import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BnccQueryFilters, BnccSkill } from '@planejador-bncc/shared-types';

@Injectable()
export class BnccService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: BnccQueryFilters = {}): Promise<BnccSkill[]> {
    const where: any = {};

    if (filters.nivel) {
      where.nivel = filters.nivel;
    }

    if (filters.ano !== undefined && filters.ano !== null && !isNaN(Number(filters.ano))) {
      where.ano = Number(filters.ano);
    }

    if (filters.eixo) {
      where.eixo = filters.eixo;
    }

    if (filters.q && filters.q.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { descricao: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.bnccSkill.findMany({
      where,
      orderBy: [
        { nivel: 'asc' },
        { ano: 'asc' },
        { codigo: 'asc' },
      ],
    });
  }

  async findByCodigo(codigo: string): Promise<BnccSkill | null> {
    return this.prisma.bnccSkill.findUnique({
      where: { codigo },
    });
  }
}
