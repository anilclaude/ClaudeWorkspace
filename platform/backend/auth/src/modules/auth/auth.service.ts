import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { auth } from '@app/contracts';
import { env } from '../../config';
import { User } from '../users/entities/user.entity';

// A session lasts a day — no PRD/AC pins a duration (AC10 only requires the
// session to survive reload/new tab "until it expires or I sign out"), so
// this is a defensible default rather than something derived from the spec.
// Logged in scaffold/memory/DECISIONS.md.
const SESSION_TTL = '24h';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // AC1 (success) and AC2 (uniform failure) share one code path on purpose:
  // whether the email is unregistered or the password is wrong, execution
  // reaches the exact same `return` below with the exact same message and
  // code, so the response body can never be used to tell the two causes
  // apart (PRD AC2 — "does not reveal whether an account exists").
  async login(request: auth.LoginRequest): Promise<auth.LoginResponse> {
    // Case-insensitive lookup to match the migration's `LOWER(email)`
    // functional unique index (see user.entity.ts) — a naive
    // `findOne({ where: { email } })` would be case-sensitive and miss a
    // registered "Ada@example.com" when the user types "ada@example.com".
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: request.email })
      .getOne();

    const passwordMatches = user
      ? await bcrypt.compare(request.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      return {
        success: false,
        data: null,
        error: { message: auth.LOGIN_INVALID_CREDENTIALS_MESSAGE, code: 'INVALID_CREDENTIALS' },
      };
    }

    // `role` (cafe-access-roles T00) rides on the token, not in the
    // client-facing response body (loginSuccessDataSchema/LoginUser are
    // deliberately unchanged) — only a future guard reading the JWT needs
    // it. `user.role` is `CafeRole | null`; a NULL role is signed as-is and
    // is deliberately not defaulted to anything here — see user.entity.ts.
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: SESSION_TTL },
    );

    return {
      success: true,
      data: { token, user: { id: user.id, email: user.email } },
      error: null,
    };
  }
}
