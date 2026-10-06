import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { N8nClient } from './n8n.client';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AiService, N8nClient],
  exports: [AiService, N8nClient],
})
export class AiModule {}
