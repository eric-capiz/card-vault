"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ColorPicker } from "./ColorPicker";

export function NotebookCreator() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#4f7cff");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, color }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create notebook.");
        return;
      }
      setTitle("");
      router.refresh();
    } catch {
      setError("Could not create notebook.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card stack">
      <div className="row">
        <input
          className="input"
          placeholder="New notebook — any subject, your name for it"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create notebook"}
        </button>
      </div>
      <div>
        <div className="muted" style={{ marginBottom: 6 }}>Cover color</div>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
