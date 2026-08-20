"use client";

import { useEffect } from "react";

declare const process: { env: { NEXT_PUBLIC_ERROR_MONITORING_DSN?: string } };

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    const endpoint = process.env.NEXT_PUBLIC_ERROR_MONITORING_DSN;
    const entry = {
      timestamp: new Date().toISOString(),
      service: "web",
      kind: "global-error",
      message: error.message,
      digest: error.digest,
    };
    console.error(JSON.stringify(entry));
    if (endpoint) {
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [error]);

  return (
    <html>
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <p>Something went wrong.</p>
        </main>
      </body>
    </html>
  );
}
