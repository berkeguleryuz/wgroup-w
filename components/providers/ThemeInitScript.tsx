"use client";

import { themeInitScript } from "./ThemeProvider";

/**
 * Anti-FOUC theme init as a module-level constant element inside a client
 * component. On re-renders (e.g. a locale switch re-rendering the root
 * layout) React sees the exact same element reference and bails out, so the
 * <script> fiber is never re-rendered on the client — which is what triggered
 * the dev warning "Encountered a script tag while rendering React component".
 * Server-side it still renders into <head> and runs before paint.
 */
const el = <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;

export function ThemeInitScript() {
  return el;
}
