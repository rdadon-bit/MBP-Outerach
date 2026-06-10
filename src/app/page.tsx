"use client";

import { useEffect, useState } from "react";

type Stats = {
  sentToday: number;
  newSentToday: number;
  followupSentToday: number;
  pendingToday: number;
  totalBorrowers: number;
  byStatus: Record<string, number>;
  repliesTotal: number;
  sentTotal: number;
  replyRate: string;
  daily: Record<string, { initial: number; followup: number; replies: number }>;
  senderEmail: string;
  paused: boolean;
  rampUp: boolean;
};

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1 text-navy">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = () => fetch("/api/stats").then((r) => r.json()).then(setStats);
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (!stats) return <div className="text-slate-400">Loading…</div>;

  const days = Object.entries(stats.daily).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>
        <div className="text-sm text-slate-500">
          {stats.senderEmail ? (
            <>Sending from <span className="font-medium">{stats.senderEmail}</span></>
          ) : (
            <a href="/api/auth/google" className="text-white bg-navy px-4 py-2 rounded-md hover:bg-navy-light">
              Connect Gmail →
            </a>
          )}
          {stats.paused && <span className="ml-3 text-red-600 font-medium">⏸ PAUSED</span>}
          {stats.rampUp && <span className="ml-3 text-amber-600 font-medium">Ramp-up mode</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Sent today" value={stats.sentToday} sub={`${stats.newSentToday} new · ${stats.followupSentToday} follow-ups`} />
        <Card label="Queued" value={stats.pendingToday} sub="remaining in today's window" />
        <Card label="Reply rate" value={`${stats.replyRate}%`} sub={`${stats.repliesTotal} replies / ${stats.sentTotal} sent`} />
        <Card label="Borrowers" value={stats.totalBorrowers} sub="total in database" />
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Pipeline</h2>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
          {["NEW", "IN_SEQUENCE", "RESPONDED", "CLIENT", "UNSUBSCRIBED", "BOUNCED", "DEAD"].map((s) => (
            <div key={s} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
              <div className="text-xl font-semibold text-navy">{stats.byStatus[s] || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{s.replace("_", " ")}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Last 14 days</h2>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">New emails</th>
                <th className="px-4 py-3">Follow-ups</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Replies</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No sends yet</td></tr>
              )}
              {days.map(([day, d]) => (
                <tr key={day} className="border-b border-slate-50">
                  <td className="px-4 py-2.5 font-medium">{day}</td>
                  <td className="px-4 py-2.5">{d.initial}</td>
                  <td className="px-4 py-2.5">{d.followup}</td>
                  <td className="px-4 py-2.5">{d.initial + d.followup}</td>
                  <td className="px-4 py-2.5 text-green-600 font-medium">{d.replies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
