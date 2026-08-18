// Platform-agnostic frontend logic. Imported by BOTH web and mobile.
//
// The rule that keeps this package useful: nothing here may touch the DOM,
// React Native primitives, or any renderer. The moment it does, mobile (or web)
// can no longer consume it and the shared layer quietly becomes web-only.

export {
  createApiClient,
  ApiClientError,
  type ApiClient,
  type Fetcher,
  type TokenProvider,
} from './api-client';
export {
  checkSession,
  type SessionPayload,
  type SessionCheck,
  type ActiveSession,
  type NoSession,
} from './session';
