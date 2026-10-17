"use client";

import { Button } from "@usecredo/ui/button";
import { useState } from "react";

const VARIANTS = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;

export function ThemeShowcase() {
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-6">
      {(["light", "dark"] as const).map((theme) => (
        <section
          key={theme}
          data-theme={theme}
          aria-label={`${theme} theme`}
          className="rounded-lg bg-surface-page p-6 text-content-primary"
        >
          <h2 className="mb-4 text-lg font-medium">Credo, {theme}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
            <Button loading={saving} onClick={() => setSaving(true)}>
              {saving ? "Saving" : "Save"}
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>
      ))}
    </div>
  );
}
