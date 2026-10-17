// A server component: no "use client". The server entry of the icons package does not read
// the Phosphor icon context, so it can render here (P1-15).
import { CircleNotchIcon } from "@usecredo/icons/server";
import { ThemeShowcase } from "./theme-showcase";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-content-primary">
        <CircleNotchIcon aria-hidden="true" size={24} weight="bold" data-testid="server-icon" />
        Next consumer
      </h1>
      <ThemeShowcase />
    </main>
  );
}
