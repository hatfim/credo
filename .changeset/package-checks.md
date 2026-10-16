---
"@usecredo/ui": patch
"@usecredo/icons": patch
---

Run `publint` and `@arethetypeswrong/cli` as part of each package's build, and add a bundle test that fails when `@usecredo/ui/button` pulls in another component.
