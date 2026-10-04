import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BnccService } from './bncc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BnccSkill } from '@planejador-bncc/shared-types';

@Controller('bncc')
@UseGuards(JwtAuthGuard)
export class BnccController {
  constructor(private readonly bnccService: BnccService) {}

  @Get('skills')
  async getSkills(
    @Query('nivel') nivel?: string,
    @Query('ano') ano?: string,
    @Query('eixo') eixo?: string,
    @Query('q') q?: string,
  ): Promise<BnccSkill[]> {
    const parsedAno = ano !== undefined ? parseInt(ano, 10) : undefined;
    return this.bnccService.findAll({
      nivel,
      ano: isNaN(parsedAno!) ? undefined : parsedAno,
      eixo,
      q,
    });
  }
}
