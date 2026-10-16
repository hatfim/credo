// Vitest setup file. Register it with `setupFiles: ["@usecredo/test-utils/setup"]`.
// This module has side effects by design (package.json `sideEffects` lists it).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
