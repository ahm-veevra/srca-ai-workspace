"use client";

/** Last-resort boundary for failures in the root layout itself. It renders its own <html>/<body>
 * (the root layout is bypassed here) with inline styles, since the app stylesheet may not be
 * available. Prefer the per-route error boundaries; this only catches catastrophic root errors. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          background: "#0b1220",
          color: "#e5e7eb",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "32px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ maxWidth: "28rem", fontSize: "14px", color: "#9ca3af" }}>
          The application failed to load. Please try again.
          {error.digest ? ` (ref: ${error.digest})` : ""}
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "8px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: "#E1251B",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
