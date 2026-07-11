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
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            System logs
          </h1>
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
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Loading logs...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                        {getActivityActionLabel(entry.action)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-900 dark:text-zinc-50">
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
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
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
