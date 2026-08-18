// Minimal stub. The forgot-password flow itself is out of scope for the
// login PRD (docs/prd/_ACTIVE/login.md §5, "The forgot-password flow itself
// (AC11 only requires the link to navigate)") — this route exists only so
// the login screen's "Forgot password?" link (AC11) has somewhere real to
// navigate to. No form, no wireframe; a future PRD owns this screen.
export default function ForgotPasswordPage() {
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-2 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Forgot password</h1>
      <p className="text-sm text-slate-500">This flow is not available yet.</p>
    </div>
  );
}
