"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Coffee, Eye, EyeOff, Flag, MessageCircle, RefreshCw, Search, Trash2, Users, X } from "lucide-react";

type TargetType = "recipe" | "comment";
type ModerationAction = "hide" | "restore" | "delete";
type Report = { id: string; targetType: TargetType; targetId: string; targetLabel: string; recipeId: string | null; reporterName: string; reason: string; details: string; status: string; createdAt: string };
type Recipe = { id: string; title: string; authorName: string; moderationStatus: string; createdAt: string };
type Comment = { id: string; recipeId: string; recipeTitle: string; authorName: string; body: string; moderationStatus: string; createdAt: string };
type Audit = { id: string; targetType: string; targetId: string; action: string; reason: string; createdAt: string };
type Data = { counts: { users: number; recipes: number; comments: number; openReports: number }; reports: Report[]; recipes: Recipe[]; comments: Comment[]; actions: Audit[] };
type Tab = "reports" | "comments" | "recipes" | "history";
const reasonNames: Record<string, string> = { spam: "スパム・宣伝", abuse: "嫌がらせ", inappropriate: "不適切な内容", other: "その他" };
const actionNames: Record<string, string> = { hide: "非表示", restore: "復元", delete: "削除", resolved: "対応済み", dismissed: "却下" };
const date = (value: string) => new Date(value).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("reports");
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [pending, setPending] = useState<{ targetType: TargetType; targetId: string; title: string; action: ModerationAction } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const result = await response.json().catch(() => ({})) as Data & { error?: string };
    if (!response.ok) throw new Error(result.error || "管理データを読み込めませんでした");
    setData(result);
  }, []);
  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "読み込めませんでした")); }, [refresh]);

  const matches = useCallback((...values: string[]) => !query.trim() || values.some((value) => value.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const shownReports = useMemo(() => data?.reports.filter((item) => (showClosed || item.status === "open") && matches(item.targetLabel, item.reporterName, item.details, reasonNames[item.reason] || item.reason)) ?? [], [data, showClosed, matches]);
  const shownComments = useMemo(() => data?.comments.filter((item) => matches(item.body, item.authorName, item.recipeTitle)) ?? [], [data, matches]);
  const shownRecipes = useMemo(() => data?.recipes.filter((item) => matches(item.title, item.authorName)) ?? [], [data, matches]);
  const shownHistory = useMemo(() => data?.actions.filter((item) => matches(item.targetId, item.reason, actionNames[item.action] || item.action)) ?? [], [data, matches]);

  function prepare(targetType: TargetType, targetId: string, title: string, action: ModerationAction) { setReason(""); setPending({ targetType, targetId, title, action }); setError(""); }

  async function moderate() {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/moderate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: pending.targetType, targetId: pending.targetId, action: pending.action, reason }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "操作できませんでした");
      setNotice(`${actionNames[pending.action]}しました`); setPending(null); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "操作できませんでした"); }
    finally { setBusy(false); }
  }

  async function reviewReport(id: string, status: "resolved" | "dismissed") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/reports/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "操作できませんでした");
      setNotice(status === "resolved" ? "対応済みにしました" : "通報を却下しました"); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "操作できませんでした"); }
    finally { setBusy(false); }
  }

  function controls(targetType: TargetType, targetId: string, title: string, status: string) {
    return <div className="admin-row-actions">
      {status === "hidden" ? <button disabled={busy} onClick={() => prepare(targetType, targetId, title, "restore")}><Eye size={15} /> 復元</button> : <button disabled={busy} onClick={() => prepare(targetType, targetId, title, "hide")}><EyeOff size={15} /> 非表示</button>}
      <button className="danger" disabled={busy} onClick={() => prepare(targetType, targetId, title, "delete")}><Trash2 size={15} /> 削除</button>
    </div>;
  }

  return <div className="site-shell admin-page"><header className="site-header"><div className="header-inner"><a className="brand" href="/"><span className="brand-mark"><Coffee size={22} /></span><span>Coffee<span className="brand-accent">Mate</span></span></a><a className="outline-button" href="/about"><ArrowLeft size={15} /> サイト案内</a></div></header>
    <main className="admin-wrap"><div className="admin-heading"><div><span className="section-kicker">SITE MANAGEMENT</span><h1>管理人ページ</h1><p>通報と公開投稿を確認し、必要な対応を記録します。</p></div><button className="outline-button" onClick={() => void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "読み込めませんでした"))}><RefreshCw size={16} /> 更新</button></div>
      {data && <div className="admin-stats"><div><Flag size={19} /><span>未対応の通報</span><strong>{data.counts.openReports}</strong></div><div><MessageCircle size={19} /><span>コメント</span><strong>{data.counts.comments}</strong></div><div><Coffee size={19} /><span>公開レシピ</span><strong>{data.counts.recipes}</strong></div><div><Users size={19} /><span>登録ユーザー</span><strong>{data.counts.users}</strong></div></div>}
      {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
      <div className="admin-toolbar"><div className="admin-tabs" role="tablist"><button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>通報 {data ? `(${data.counts.openReports})` : ""}</button><button className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}>コメント</button><button className={tab === "recipes" ? "active" : ""} onClick={() => setTab("recipes")}>レシピ</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>操作履歴</button></div><label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="表示中の項目を検索" /></label></div>
      {tab === "reports" && <div className="admin-list"><div className="admin-list-note"><span>通報の確認</span><label><input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} /> 対応済みも表示</label></div>{shownReports.length ? shownReports.map((item) => <article className="admin-row" key={item.id}><div className="admin-row-top"><span className={`admin-status ${item.status === "open" ? "pending" : ""}`}>{item.status === "open" ? "未対応" : item.status === "resolved" ? "対応済み" : "却下"}</span><span>{item.targetType === "recipe" ? "レシピ" : "コメント"} · {date(item.createdAt)}</span></div><h3>{item.targetLabel}</h3><p>理由：{reasonNames[item.reason] || item.reason} · 通報者：{item.reporterName}</p>{item.details && <blockquote>{item.details}</blockquote>}{item.recipeId && <a className="admin-target-link" href={`/?recipe=${encodeURIComponent(item.recipeId)}`}>対象のレシピを見る ↗</a>}{item.status === "open" && <div className="admin-row-actions">{controls(item.targetType, item.targetId, item.targetLabel, "visible")}<button disabled={busy} onClick={() => void reviewReport(item.id, "resolved")}>対応済み</button><button disabled={busy} onClick={() => void reviewReport(item.id, "dismissed")}>却下</button></div>}</article>) : <p className="admin-empty">表示する通報はありません。</p>}</div>}
      {tab === "comments" && <div className="admin-list"><div className="admin-list-note">直近100件の公開レシピのコメント</div>{shownComments.length ? shownComments.map((item) => <article className="admin-row" key={item.id}><div className="admin-row-top"><span className={`admin-status ${item.moderationStatus === "hidden" ? "hidden" : ""}`}>{item.moderationStatus === "hidden" ? "非表示" : "公開中"}</span><span>{date(item.createdAt)}</span></div><h3>{item.authorName}</h3><p>{item.body}</p><a className="admin-target-link" href={`/?recipe=${encodeURIComponent(item.recipeId)}`}>{item.recipeTitle} ↗</a>{controls("comment", item.id, item.body, item.moderationStatus)}</article>) : <p className="admin-empty">表示するコメントはありません。</p>}</div>}
      {tab === "recipes" && <div className="admin-list"><div className="admin-list-note">直近100件の公開レシピ</div>{shownRecipes.length ? shownRecipes.map((item) => <article className="admin-row" key={item.id}><div className="admin-row-top"><span className={`admin-status ${item.moderationStatus === "hidden" ? "hidden" : ""}`}>{item.moderationStatus === "hidden" ? "非表示" : "公開中"}</span><span>{date(item.createdAt)}</span></div><h3>{item.title}</h3><p>作成者：{item.authorName}</p><a className="admin-target-link" href={`/?recipe=${encodeURIComponent(item.id)}`}>レシピを見る ↗</a>{controls("recipe", item.id, item.title, item.moderationStatus)}</article>) : <p className="admin-empty">表示するレシピはありません。</p>}</div>}
      {tab === "history" && <div className="admin-list"><div className="admin-list-note">直近100件の管理操作</div>{shownHistory.length ? shownHistory.map((item) => <article className="admin-row admin-history-row" key={item.id}><div className="admin-row-top"><span className="admin-status">{actionNames[item.action] || item.action}</span><span>{date(item.createdAt)}</span></div><h3>{item.targetType === "recipe" ? "レシピ" : item.targetType === "comment" ? "コメント" : "通報"} · {item.targetId}</h3>{item.reason && <p>理由：{item.reason}</p>}</article>) : <p className="admin-empty">操作履歴はありません。</p>}</div>}
    </main>
    {pending && <div className="report-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPending(null); }}><div className="report-dialog" role="dialog" aria-modal="true" aria-label="管理操作を確認"><div className="report-dialog-head"><div><span className="section-kicker">MODERATION</span><h3>{actionNames[pending.action]}の確認</h3></div><button onClick={() => setPending(null)} aria-label="閉じる"><X size={19} /></button></div><p>対象：{pending.title}</p>{pending.action === "delete" && <p className="admin-danger-note">削除した内容は復元できません。</p>}<label>対応理由（任意）<textarea maxLength={300} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="判断の理由を記録できます" /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="report-dialog-actions"><button onClick={() => setPending(null)}>キャンセル</button><button className={pending.action === "delete" ? "admin-danger-button" : "primary-button"} disabled={busy} onClick={() => void moderate()}>{busy ? "処理中..." : `${actionNames[pending.action]}する`}</button></div></div></div>}
  </div>;
}
