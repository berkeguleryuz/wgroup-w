"use client";

// Last-resort boundary for errors in the root layout itself. Rendered outside
// the locale/i18n providers, so the copy is intentionally static.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          fontFamily: "system-ui, sans-serif",
          background: "#fbf7f6",
          color: "#100d08",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "24px", margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#5b534a", margin: 0 }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "8px",
            padding: "12px 20px",
            borderRadius: "11px",
            border: "none",
            background: "#100d08",
            color: "#fbf7f6",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
