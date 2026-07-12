"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getActivityActionLabel } from "@/lib/en/activity-log-labels";

type ActivityLogEntry = {
  id: string;
  timestamp: string;
  action: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  ip?: string;
};

type LogsResponse = {
  logs: ActivityLogEntry[];
  actions: Array<{ value: string; label: string }>;
  error?: string;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [actions, setActions] = useState<LogsResponse["actions"]>([]);
  const [selectedAction, setSelectedAction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async (actionFilter = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (actionFilter) {
        params.set("action", actionFilter);
      }

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      const payload = (await response.json()) as LogsResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load logs.");
      }

      setLogs(payload.logs);
      setActions(payload.actions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load logs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs(selectedAction);
  }, [loadLogs, selectedAction]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1d1d1f]">System logs</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sign-in, registration, site creation and editing activity.
          </p>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">
            Filter
          </span>
          <select
            value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value)}
            className="rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm text-[#1d1d1f] shadow-[inset_0_1px_2px_rgba(30,27,75,0.06)] outline-none transition focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/20"
          >
            <option value="">All logs</option>
            {actions.map((action) => (
              <option key={action.value} value={action.value}>
                {getActivityActionLabel(action.value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="glass rounded-3xl px-4 py-8 text-sm text-zinc-500">
          Loading logs...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50/80 px-4 py-6 text-sm text-red-700 backdrop-blur-sm">
          {error}
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/40 bg-white/40 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                        {new Date(entry.timestamp).toLocaleString("en-US")}
                      </td>
                      <td className="px-4 py-3 text-[#1d1d1f]">
                        {getActivityActionLabel(entry.action)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#1d1d1f]">
                          {entry.userName || "—"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {entry.userEmail || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {entry.resourceId ? (
                          entry.resourceType === "project" ? (
                            <Link
                              href={`/en/builder/${entry.resourceId}`}
                              className="text-[#5847e0] transition hover:text-[#6353e6]"
                            >
                              {entry.resourceId.slice(0, 8)}…
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-zinc-500">
                              {entry.resourceId.slice(0, 8)}…
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {entry.ip || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
