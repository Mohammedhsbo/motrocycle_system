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
    <html lang="en">
      <body>
        <main className="min-h-screen grid place-items-center bg-zinc-50 p-6 text-center text-zinc-900">
          <div className="max-w-md rounded-xl bg-white p-8 shadow-2xl border border-zinc-100">
            <h1 className="text-3xl font-black text-blue-900 mb-4">Oops! Something went wrong</h1>
            <p className="text-zinc-600 mb-8">We've been notified and are looking into the issue.</p>
            <div className="space-y-4">
              <button onClick={() => window.location.reload()} className="w-full rounded-md bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700">
                Try Again
              </button>
              <a href="https://instagram.com/awlad_ghanem" target="_blank" rel="noopener noreferrer" className="block w-full rounded-md border border-blue-200 bg-blue-50 px-4 py-3 font-bold text-blue-800 transition hover:bg-blue-100">
                Contact us on Instagram
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
