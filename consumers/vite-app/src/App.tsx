import { Button } from "@usecredo/ui/button";

const VARIANTS = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;

function ThemedRegion({ theme }: { theme: "light" | "dark" }) {
  return (
    <section data-theme={theme} aria-label={`${theme} theme`} className="rounded-lg bg-surface-page p-6 text-content-primary">
      <h2 className="mb-4 text-lg font-medium">Credo, {theme}</h2>
      <div className="flex flex-wrap items-center gap-3">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        <Button loading>Saving</Button>
        <Button disabled>Disabled</Button>
      </div>
    </section>
  );
}

export function App() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="app-card bg-background text-foreground">
        <h1 className="text-2xl font-semibold text-brand">Vite consumer</h1>
        <p>
          This card and the button below use the app&apos;s own Tailwind theme and variables.
        </p>
        <p className="mt-3 rounded-lg bg-surface-container p-2 font-sans">Collides with Credo&apos;s theme names: the app&apos;s values win.</p>
        <button type="button" className="mt-3 rounded-sm bg-primary px-3 py-1 text-primary-foreground">
          App button
        </button>
      </header>
      <ThemedRegion theme="light" />
      <ThemedRegion theme="dark" />
    </main>
  );
}
