"use client";

import { useEffect, useState } from "react";
import {
  HistoricalAttestation,
  getPastEvents,
  formatStroops,
  formatTimestamp,
  explorerUrl,
} from "../lib/stellar";

export default function AttestationHistory() {
  const [events, setEvents] = useState<HistoricalAttestation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPastEvents()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">No historical attestations found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Attestation History
      </h3>

      <div className="space-y-3">
        {events.map((evt, i) => {
          const reserve = parseFloat(evt.reserve);
          const liabilities = parseFloat(evt.total_liabilities);
          const ratio = liabilities > 0 ? ((reserve / liabilities) * 100).toFixed(1) : "∞";

          return (
            <div
              key={evt.seq || i}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                {/* Timeline dot */}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    evt.solvent
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  #{evt.seq}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {evt.solvent ? "✅ SOLVENT" : "❌ INSOLVENT"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatTimestamp(evt.timestamp)} · Ledger {evt.ledger}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Reserve: <strong>{formatStroops(evt.reserve)} XLM</strong>
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  Liabilities: <strong>{formatStroops(evt.total_liabilities)} XLM</strong>
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  Ratio: <strong>{ratio}%</strong>
                </span>
                {evt.txHash && (
                  <a
                    href={explorerUrl("tx", evt.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Tx ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
