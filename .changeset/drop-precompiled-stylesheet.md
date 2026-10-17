---
"@usecredo/tailwind-config": minor
---

Remove the `./precompiled.css` export and the `precompiledCandidates` helper: the precompiled stylesheet is dropped and Tailwind v4 is required (decisions 0005 and 0009). The package is at 0.0.0 and unreleased, so no consumer depends on it; the minor bump records the removed export. The `tailwindcss` peer range is now `^4.3.0` (tested 4.3.x). `./theme.css` is unchanged.
