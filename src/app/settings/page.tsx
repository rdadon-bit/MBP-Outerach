"use client";

import { useEffect, useState } from "react";

export default function Settings() {
  const [s, setS] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setS);
  }, []);

  const save = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setSaved("Saved.");
    setTimeout(() => setSaved(""), 2000);
  };

  const field = (key: string, label: string, hint?: string, type = "text") => (
    <div>
      <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={s[key] ?? ""}
        onChange={(e) => setS({ ...s, [key]: e.target.value })}
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
      />
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );

  const toggle = (key: string, label: string, hint: string) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={s[key] === "true"}
        onChange={(e) => setS({ ...s, [key]: String(e.target.checked) })}
        className="mt-1"
      />
      <span>
        <span className="text-sm font-medium">{label}</span>
        <span className="block text-xs text-slate-400">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold text-navy">Settings</h1>

      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="text-sm font-medium">Gmail connection</div>
            <div className="text-xs text-slate-400">{s.sender_email || "Not connected"}</div>
          </div>
          <a href="/api/auth/google" className="text-sm bg-navy text-white px-4 py-2 rounded-md hover:bg-navy-light">
            {s.gmail_connected === "true" ? "Reconnect" : "Connect Gmail"}
          </a>
        </div>

        {field("sender_name", "Sender name", "Shown in the From line")}
        <div className="grid grid-cols-2 gap-4">
          {field("daily_new_limit", "New emails / day", "Default 120", "number")}
          {field("daily_followup_limit", "Follow-ups / day", "Default 80", "number")}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field("window_start_pt", "Window start (PT hour)", "Default 9", "number")}
          {field("window_end_pt", "Window end (PT hour)", "Default 15", "number")}
        </div>

        {toggle("ramp_up", "Ramp-up mode", "Starts at ~40 emails/day and adds 20/week until full volume. Strongly recommended — going straight to 200/day from a fresh sender will trigger spam filters.")}
        {toggle("paused", "Pause all sending", "Queue stops immediately; nothing sends until unpaused.")}

        <div className="flex items-center gap-4 pt-2">
          <button onClick={save} className="bg-navy text-white px-5 py-2 rounded-md text-sm hover:bg-navy-light">
            Save settings
          </button>
          {saved && <span className="text-green-600 text-sm">{saved}</span>}
        </div>
      </div>
    </div>
  );
}
