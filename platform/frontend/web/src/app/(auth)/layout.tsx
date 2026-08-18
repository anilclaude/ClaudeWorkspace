// Pre-auth chrome: deliberately none.
//
// Login, forgot-password, and anything else reachable before sign-in renders
// here — centered on a plain background, matching those screens' wireframes,
// which show no app header or navigation.
//
// Do not add nav to this layout. If a pre-auth screen needs the app shell,
// it probably belongs under (app) instead.
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">{children}</div>
  );
}
