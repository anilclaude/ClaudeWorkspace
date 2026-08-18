import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

interface ReqLike {
  headers: Record<string, string | string[] | undefined>;
}
interface ResLike {
  setHeader: (name: string, value: string) => void;
}

// Propagates a request id across service hops. Without this, a failure that
// crosses two services produces two unrelated log streams and no way to join
// them — which is the single most common regret when splitting a monolith.
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: ReqLike, res: ResLike, next: () => void): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    req.headers[REQUEST_ID_HEADER] = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
