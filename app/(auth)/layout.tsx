/**
 * Auth layout — no app shell. Centered, calm, generous white space.
 * Used by login, signup, and accept-invite.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <span className="text-h1 text-primary-700">TrustOps</span>
        </div>
        {children}
      </div>
    </div>
  );
}
