import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeepSeekService } from './deepseek.service';

@Global()
@Module({
  imports: [HttpModule.register({ timeout: 60000, maxRedirects: 2 })],
  providers: [DeepSeekService],
  exports: [DeepSeekService],
})
export class DeepSeekModule {}
