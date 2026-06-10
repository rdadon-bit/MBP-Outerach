"use client";

import { useState } from "react";
import Papa from "papaparse";

// Maps common CoStar / Elementix / generic header names to our fields
const HEADER_MAP: Record<string, string> = {
  "first name": "firstName", firstname: "firstName", first: "firstName",
  "last name": "lastName", lastname: "lastName", last: "lastName",
  email: "email", "email address": "email", "e-mail": "email",
  company: "company", "company name": "company", owner: "company", "owner name": "company",
  phone: "phone", "phone number": "phone", mobile: "phone",
  "property address": "propertyAddress", address: "propertyAddress", "property": "propertyAddress",
  "property type": "propertyType", type: "propertyType", "asset type": "propertyType",
  "loan amount": "loanAmount", loan: "loanAmount", "mortgage amount": "loanAmount", "loan balance": "loanAmount",
  notes: "notes",
};

export default function ImportPage() {
  const [source, setSource] = useState("costar");
  const [preview, setPreview] = useState<any[]>([]);
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const handleFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Record<string, string>[]).map((raw) => {
          const row: Record<string, string> = {};
          for (const [key, val] of Object.entries(raw)) {
            const mapped = HEADER_MAP[key.trim().toLowerCase()];
            if (mapped && val) row[mapped] = val;
          }
          // fallback: split a single "name"/"contact" column
          if (!row.firstName) {
            const name = raw["Name"] || raw["name"] || raw["Contact"] || raw["contact"] || "";
            const parts = name.trim().split(/\s+/);
            if (parts[0]) row.firstName = parts[0];
            if (parts.length > 1) row.lastName = parts.slice(1).join(" ");
          }
          return row;
        }).filter((r) => r.email);
        setPreview(rows);
        setResult(rows.length ? "" : "No rows with email addresses found. Check the CSV headers.");
      },
    });
  };

  const doImport = async () => {
    setBusy(true);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, rows: preview }),
    });
    const data = await res.json();
    setResult(`Imported ${data.imported} new borrowers · ${data.skipped} skipped (duplicates or missing email)`);
    setPreview([]);
    setBusy(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-navy">Import Borrowers</h1>
      <p className="text-sm text-slate-600">
        Export a contact list from CoStar or Elementix as CSV and drop it here. Duplicate emails are
        skipped automatically, so you can re-import overlapping lists safely. New borrowers enter the
        queue in order — up to 120 initial emails go out each weekday.
      </p>

      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium">Source:</label>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-sm">
          <option value="costar">CoStar</option>
          <option value="elementix">Elementix</option>
          <option value="manual">Other</option>
        </select>
      </div>

      <label className="block border-2 border-dashed border-slate-300 rounded-lg p-10 text-center cursor-pointer hover:border-gold transition-colors">
        <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <span className="text-slate-500">Click to choose a CSV file (or drag it onto the button)</span>
      </label>

      {result && <div className="bg-green-50 border border-green-200 text-green-800 rounded-md px-4 py-3 text-sm">{result}</div>}

      {preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{preview.length} rows ready to import</div>
            <button onClick={doImport} disabled={busy} className="bg-navy text-white px-5 py-2 rounded-md text-sm hover:bg-navy-light disabled:opacity-50">
              {busy ? "Importing…" : `Import ${preview.length} borrowers`}
            </button>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Company</th><th className="px-3 py-2">Property</th><th className="px-3 py-2">Loan</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-3 py-1.5">{r.firstName} {r.lastName}</td>
                    <td className="px-3 py-1.5">{r.email}</td>
                    <td className="px-3 py-1.5">{r.company}</td>
                    <td className="px-3 py-1.5">{r.propertyAddress}</td>
                    <td className="px-3 py-1.5">{r.loanAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
