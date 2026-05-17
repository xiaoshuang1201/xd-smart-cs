import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  readonly errorCode: number;

  constructor(errorCode: number, message: string, httpStatus: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ code: errorCode, message }, httpStatus);
    this.errorCode = errorCode;
  }
}
