import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Controller-level coverage for T03 — the routing/validation wiring around
// AuthService.login, which auth.service.spec.ts covers for AC1/AC2 behavior.
describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock };

  beforeEach(async () => {
    authService = { login: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // AC1 — a well-formed request is handed straight to the service and its
  // success response is returned unchanged.
  it('delegates a well-formed request to AuthService and returns its result', async () => {
    const serviceResponse = {
      success: true,
      data: { token: 'signed-jwt', user: { id: 'user-1', email: 'ada@example.com' } },
      error: null,
    };
    authService.login.mockResolvedValue(serviceResponse);

    const result = await controller.login({
      email: 'ada@example.com',
      password: 'correct-horse',
    });

    expect(authService.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'correct-horse',
    });
    expect(result).toEqual(serviceResponse);
  });

  // AC2 — the uniform error, once produced by the service, passes through
  // the controller untouched (no extra branching that could reintroduce a
  // distinction between the two failure causes).
  it('returns the uniform error response from AuthService unchanged', async () => {
    const serviceResponse = {
      success: false,
      data: null,
      error: { message: 'Email or password is incorrect', code: 'INVALID_CREDENTIALS' },
    };
    authService.login.mockResolvedValue(serviceResponse);

    const result = await controller.login({
      email: 'nobody@example.com',
      password: 'whatever',
    });

    expect(result).toEqual(serviceResponse);
  });

  // Not an AC itself — a malformed body (missing password) is a client bug,
  // not a credential outcome, so it is rejected before AuthService is ever
  // invoked rather than being funneled into the uniform-error branch.
  it('rejects a malformed request body without calling AuthService', async () => {
    await expect(controller.login({ email: 'not-an-email' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(authService.login).not.toHaveBeenCalled();
  });
});
