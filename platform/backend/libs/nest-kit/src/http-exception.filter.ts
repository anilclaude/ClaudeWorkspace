import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';

// Catches everything, so no route can leak a stack trace or an ORM error
// string to a caller. Unexpected errors are logged in full server-side and
// returned as a generic message.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status: (c: number) => { json: (b: unknown) => void } }>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    if (isHttp) {
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string }).message ?? exception.message);
    } else {
      message = 'Something went wrong. Try again.';
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(status).json({ success: false, data: null, error: { message } });
  }
}
