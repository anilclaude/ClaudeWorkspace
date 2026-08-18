// Contracts served by the core service (:4002).

export const CORE_SERVICE = 'core' as const;
export const CORE_ROUTES = {
  health: '/health',
  healthLive: '/health/live',
} as const;
