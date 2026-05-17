import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class FingerprintMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const fingerprint = req.headers['x-fingerprint'] as string || 'unknown';
    (req as any).fingerprint = fingerprint;
    next();
  }
}
