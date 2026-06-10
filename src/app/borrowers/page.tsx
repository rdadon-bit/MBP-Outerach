"use client";

import { useEffect, useState } from "react";

type Borrower = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  company: string | null;
  propertyAddress: string | null;
  loanAmount: string | null;
  source: string | null;
  status: string;
  touchCount: number;
  lastTouchAt: string | null;
  nextTouchAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  IN_SEQUENCE: "bg-amber-100 text-amber-700",
  RESPONDED: "bg-green-100 text-green-700",
  CLIENT: "bg-emerald-100 text-emerald-800",
  UNSUBSCRIBED: "bg-slate-100 text-slate-500",
  BOUNCED: "bg-red-100 text-red-600",
  DEAD: "bg-slate-200 text-slate-600",
};

export default function Borrowers() {
  const [rows, setRows] = useState<Borrower[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    fetch(`/api/borrowers?${params}`).then((r) => r.json()).then(setRows);
  };
  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch("/api/borrowers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Borrowers</h1>
        <div className="flex gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search name, email, company, address…"
            className="border border-slate-300 rounded-md px-3 py-2 text-sm w-72"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Loan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Touches</th>
              <th className="px-4 py-3">Next touch</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No borrowers yet — import a CSV to get started.</td></tr>
            )}
            {rows.map((b) => (
              <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{b.firstName} {b.lastName}</td>
                <td className="px-4 py-2.5 text-slate-600">{b.email}</td>
                <td className="px-4 py-2.5">{b.company}</td>
                <td className="px-4 py-2.5 max-w-[180px] truncate">{b.propertyAddress}</td>
                <td className="px-4 py-2.5">{b.loanAmount}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || ""}`}>
                    {b.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">{b.touchCount}</td>
                <td className="px-4 py-2.5 text-slate-500">
                  {b.nextTouchAt ? new Date(b.nextTouchAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    defaultValue=""
                    onChange={(e) => e.target.value && updateStatus(b.id, e.target.value)}
                    className="border border-slate-200 rounded text-xs px-1 py-1"
                  >
                    <option value="">Set…</option>
                    <option value="CLIENT">Client</option>
                    <option value="RESPONDED">Responded</option>
                    <option value="DEAD">Dead</option>
                    <option value="UNSUBSCRIBED">Unsubscribe</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
