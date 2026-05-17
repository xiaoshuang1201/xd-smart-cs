import { Global, Module } from '@nestjs/common';
import { SSEManagerService } from './sse-manager.service';

@Global()
@Module({
  providers: [SSEManagerService],
  exports: [SSEManagerService],
})
export class SSEModule {}
