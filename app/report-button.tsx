"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";

export default function ReportButton({ targetType, targetId, loggedIn, compact = false }: { targetType: "recipe" | "comment"; targetId: string; loggedIn: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function begin() {
    if (!loggedIn) {
      location.assign(`/login?return_to=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setMessage("");
    setOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType, targetId, reason, details }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "通報を送信できませんでした");
      setOpen(false);
      setMessage("通報を受け付けました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通報を送信できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className={compact ? "report-link" : ""} onClick={begin}><Flag size={compact ? 13 : 17} /> 通報</button>
    {message && !open && <span className="report-feedback" role="status">{message}</span>}
    {open && <div className="report-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <form className="report-dialog" onSubmit={(event) => void submit(event)} role="dialog" aria-modal="true" aria-label="投稿を通報">
        <div className="report-dialog-head"><div><span className="section-kicker">REPORT</span><h3>{targetType === "recipe" ? "レシピ" : "コメント"}を通報</h3></div><button type="button" onClick={() => setOpen(false)} aria-label="閉じる"><X size={19} /></button></div>
        <p>内容を確認し、必要に応じて運営が対応します。</p>
        <label>理由<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="spam">スパム・宣伝</option><option value="abuse">嫌がらせ・攻撃的な内容</option><option value="inappropriate">不適切な内容</option><option value="other">その他</option></select></label>
        <label>補足（任意）<textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} rows={4} placeholder="気になった点を教えてください" /></label>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="report-dialog-actions"><button type="button" onClick={() => setOpen(false)}>キャンセル</button><button className="primary-button" disabled={busy}>{busy ? "送信中..." : "通報する"}</button></div>
      </form>
    </div>}
  </>;
}
