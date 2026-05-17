import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DifyService } from './dify.service';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 2,
    }),
  ],
  providers: [DifyService],
  exports: [DifyService],
})
export class DifyModule {}
