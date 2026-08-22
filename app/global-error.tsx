"use client";

/**
 * Last resort: a failure in the root layout itself, where the app shell and its
 * styles are gone. Replaces the whole document, so it carries its own markup
 * and inline styling rather than relying on anything that may not have loaded.
 */
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
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6fa",
          color: "#12203a",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1.25rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#06377b", margin: 0 }}>
            The library system couldn&rsquo;t start
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#3a4a63", lineHeight: 1.6 }}>
            Something failed before the page could load. Reloading usually clears it.
            {error.digest ? ` Reference ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "#06377b",
              color: "#f4f6fa",
              border: 0,
              borderRadius: "0.75rem",
              padding: "0.7rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
