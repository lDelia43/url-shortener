import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { ControllersModule } from './controllers/controllers.module';

@Module({
  imports: [
    // Validates the .env with Zod at startup (fail-fast). isGlobal => ConfigService
    // is available across the whole app without re-importing.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Aggregates every controller (which in turn pulls services + repositories).
    // Adding a feature = registering it in its aggregator module, nothing here.
    ControllersModule,
  ],
})
export class AppModule {}
