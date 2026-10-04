import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BnccModule } from './modules/bncc/bncc.module';
import { CsrfGuard } from './common/guards/csrf.guard';

@Module({
  imports: [PrismaModule, AuthModule, BnccModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
