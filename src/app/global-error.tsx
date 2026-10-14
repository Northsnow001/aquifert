"use client";

import { useEffect } from "react";

/** Replaces the root layout when it fails, so it brings its own document and plain styles. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const button = { height: 44, padding: "0 20px", borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: "pointer" } as const;
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", background: "#f4f6f9", color: "#16263b" }}>
        <title>Aquifert</title>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Aquifert didn&apos;t load</h1>
          <p style={{ maxWidth: 440, marginTop: 10, lineHeight: 1.6, color: "#4b5d73" }}>
            This is usually a brief hiccup while the server is busy. Try again in a moment.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button type="button" onClick={() => retry()} style={{ ...button, border: 0, background: "#2f6fb3", color: "#fff" }}>
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()} style={{ ...button, border: "1px solid #d6dee7", background: "#fff", color: "#16263b" }}>
              Reload the page
            </button>
          </div>
          {error.digest ? <p style={{ marginTop: 18, fontFamily: "monospace", fontSize: 12, color: "#8494a7" }}>Reference {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
