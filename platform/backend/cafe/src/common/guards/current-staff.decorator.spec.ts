import type { ExecutionContext } from '@nestjs/common';
import { currentStaffFactory } from './current-staff.decorator';
import type { AuthenticatedRequest } from './authenticated-request';

function buildContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

// AC3 — @CurrentStaff() is the alternative, decorator-based way a handler
// reads the staff id RolesGuard attaches (VC-003: "the handler reads the
// staff id from the token — never from the request body").
describe('currentStaffFactory (@CurrentStaff())', () => {
  it('reads staffId set by RolesGuard off the request', () => {
    const request: AuthenticatedRequest = { headers: {}, staffId: 'staff-1' };

    expect(currentStaffFactory(undefined, buildContext(request))).toBe('staff-1');
  });

  // A route not behind RolesGuard (e.g. @Public()) never had staffId set —
  // reading undefined here rather than throwing or defaulting to something
  // that looks like a real id is the correct, honest behavior.
  it('returns undefined when the request was never authenticated', () => {
    const request: AuthenticatedRequest = { headers: {} };

    expect(currentStaffFactory(undefined, buildContext(request))).toBeUndefined();
  });
});
