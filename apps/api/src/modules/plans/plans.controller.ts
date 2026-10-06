import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponse, PlanDetail, PlanSummary } from '@planejador-bncc/shared-types';
import {
  GeneratePlanRequestSchema,
  UpdatePlanRequestSchema,
} from './dto/plans.dto';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(
    @CurrentUser() user: UserResponse,
    @Body() body: any,
  ): Promise<PlanDetail> {
    const parseResult = GeneratePlanRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const messages = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new BadRequestException(`Dados inválidos para geração do plano: ${messages}`);
    }

    return this.plansService.generatePlan(user, parseResult.data);
  }

  @Get()
  async list(
    @CurrentUser() user: UserResponse,
    @Query('q') q?: string,
  ): Promise<PlanSummary[]> {
    return this.plansService.listPlans(user.id, q);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: UserResponse,
    @Param('id') id: string,
  ): Promise<PlanDetail> {
    return this.plansService.getPlanById(user.id, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: UserResponse,
    @Param('id') id: string,
    @Body() body: any,
  ): Promise<PlanDetail> {
    const parseResult = UpdatePlanRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const messages = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new BadRequestException(`Dados inválidos para atualização do plano: ${messages}`);
    }

    return this.plansService.updatePlan(user.id, id, parseResult.data);
  }
}
