import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("uses a neutral dark palette across page, card, hero, and footer surfaces", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const darkTheme = css.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.ok(darkTheme, "expected a .dark theme block");

  const expectedTokens = [
    "--background: #212121;",
    "--foreground: #f5f5f5;",
    "--primary-foreground: #212121;",
    "--surface-dark: #181818;",
    "--surface-dark-foreground: #f5f5f5;",
    "--muted: #2a2a2a;",
    "--muted-foreground: #a3a3a3;",
    "--border: #383838;",
    "--cinema-950: #111111;",
    "--cinema-900: #171717;",
    "--cinema-850: #1c1c1c;",
    "--cinema-800: #242424;",
    "--cinema-700: #303030;",
    "--cinema-600: #424242;",
    "--hero-amber-950: #111111;",
    "--hero-amber-900: #171717;",
    "--hero-amber-800: #242424;",
    "--shadow-rgb: 0 0 0;",
  ];

  for (const token of expectedTokens) {
    assert.match(darkTheme, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
