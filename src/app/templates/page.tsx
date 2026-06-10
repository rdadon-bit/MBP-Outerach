"use client";

import { useEffect, useState } from "react";

type Template = {
  id?: string;
  name: string;
  touchType: string;
  subject: string;
  body: string;
  active: boolean;
};

const TOUCH_TYPES = [
  { key: "initial", label: "Initial email (day 0)" },
  { key: "followup1", label: "Follow-up 1 (day 3)" },
  { key: "followup2", label: "Follow-up 2 (day 7)" },
  { key: "followup3", label: "Follow-up 3 (day 14)" },
  { key: "monthly", label: "Monthly check-in" },
];

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saved, setSaved] = useState("");

  const load = () => fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  useEffect(() => { load(); }, []);

  const edit = (touchType: string) => {
    const existing = templates.find((t) => t.touchType === touchType && t.active);
    setEditing(
      existing ?? { name: touchType, touchType, subject: "", body: "", active: true }
    );
    setSaved("");
  };

  const save = async () => {
    if (!editing) return;
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaved("Saved.");
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-navy">Email Templates</h1>
      <p className="text-sm text-slate-600">
        Merge fields: <code className="bg-slate-100 px-1 rounded">{"{{firstName}}"}</code>{" "}
        <code className="bg-slate-100 px-1 rounded">{"{{lastName}}"}</code>{" "}
        <code className="bg-slate-100 px-1 rounded">{"{{company}}"}</code>{" "}
        <code className="bg-slate-100 px-1 rounded">{"{{propertyAddress}}"}</code>{" "}
        <code className="bg-slate-100 px-1 rounded">{"{{propertyType}}"}</code>{" "}
        <code className="bg-slate-100 px-1 rounded">{"{{loanAmount}}"}</code>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {TOUCH_TYPES.map((t) => {
          const has = templates.some((x) => x.touchType === t.key && x.active);
          return (
            <button
              key={t.key}
              onClick={() => edit(t.key)}
              className={`rounded-md border px-3 py-3 text-xs text-left transition-colors ${
                editing?.touchType === t.key
                  ? "border-gold bg-amber-50"
                  : has
                  ? "border-slate-200 bg-white hover:border-gold"
                  : "border-dashed border-red-300 bg-red-50 hover:border-gold"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className={has ? "text-green-600 mt-1" : "text-red-500 mt-1"}>
                {has ? "✓ Ready" : "Missing — sends will fail"}
              </div>
            </button>
          );
        })}
      </div>

      {editing && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Subject</label>
            <input
              value={editing.subject}
              onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="e.g. Financing options for {{propertyAddress}}"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Body</label>
            <textarea
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              rows={12}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
              placeholder={"Hi {{firstName}},\n\n..."}
            />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={save} className="bg-navy text-white px-5 py-2 rounded-md text-sm hover:bg-navy-light">
              Save template
            </button>
            {saved && <span className="text-green-600 text-sm">{saved}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
