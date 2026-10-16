import type { ReactNode } from "react";

/** Centered layout for login / register screens. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-3 py-8 sm:px-4 sm:py-12">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
