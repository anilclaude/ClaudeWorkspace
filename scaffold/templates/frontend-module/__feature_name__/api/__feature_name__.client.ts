// Replace with coreService if this feature's data lives in backend/core
// instead — see src/lib/services.ts.
import { authService } from '@/lib/services';
import { __featureName__ListSchema } from '../schemas/__feature_name__.schema';

// Calls the owning service directly — no BFF layer. authService()/coreService()
// are already contract-validated @app/frontend-core clients pointed at that
// service's public URL; this file only adds the route path and the schema.
export function fetch__FeatureName__List() {
  return authService().get('/__feature_name__', __featureName__ListSchema);
}
