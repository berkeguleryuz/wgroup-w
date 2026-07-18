import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAuthBaseUrl,
  resolvePublicAppUrl,
} from "../../lib/app-url";

test("prefers BETTER_AUTH_URL for the auth server", () => {
  assert.equal(
    resolveAuthBaseUrl({
      BETTER_AUTH_URL: "https://auth.example.com/",
      NEXT_PUBLIC_APP_URL: "https://www.example.com",
    }),
    "https://auth.example.com",
  );
});

test("prefers NEXT_PUBLIC_APP_URL for public links", () => {
  assert.equal(
    resolvePublicAppUrl({
      BETTER_AUTH_URL: "https://auth.example.com",
      NEXT_PUBLIC_APP_URL: "https://www.example.com/",
    }),
    "https://www.example.com",
  );
});

test("falls back between server URL variables and then localhost", () => {
  assert.equal(
    resolveAuthBaseUrl({ NEXT_PUBLIC_APP_URL: "http://localhost:3050/" }),
    "http://localhost:3050",
  );
  assert.equal(
    resolvePublicAppUrl({ BETTER_AUTH_URL: "http://localhost:3050/" }),
    "http://localhost:3050",
  );
  assert.equal(resolvePublicAppUrl({}), "http://localhost:3000");
});

test("rejects non-http URL schemes", () => {
  assert.throws(
    () => resolveAuthBaseUrl({ BETTER_AUTH_URL: "javascript:alert(1)" }),
    /http or https/i,
  );
});
