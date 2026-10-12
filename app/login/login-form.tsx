"use client";

import { useState } from "react";
import { ArrowRight, Coffee, Copy, KeyRound } from "lucide-react";

type Mode = "login" | "signup" | "recover";

export default function LoginForm({ returnTo }: { returnTo: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newRecoveryCode, setNewRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function selectMode(next: Mode) { setMode(next); setError(""); setPassword(""); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, recoveryCode }) });
      const data = await response.json().catch(() => ({})) as { error?: string; recoveryCode?: string };
      if (!response.ok) throw new Error(data.error || "操作を完了できませんでした");
      if (data.recoveryCode) { setNewRecoveryCode(data.recoveryCode); setPassword(""); }
      else location.assign(returnTo);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "操作を完了できませんでした"); }
    finally { setBusy(false); }
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(newRecoveryCode); setCopied(true); }
    catch { setError("コピーできませんでした。コードを手動で控えてください"); }
  }

  return <div className="site-shell auth-page"><header className="site-header"><div className="header-inner"><a className="brand" href="/"><span className="brand-mark"><Coffee size={22} /></span><span>Coffee<span className="brand-accent">Mate</span></span></a><a className="outline-button" href="/">レシピを見る</a></div></header><main className="auth-layout"><div className="auth-intro"><span className="section-kicker">WELCOME TO COFFEEMATE</span><h1>コーヒーの記録を、<br />気軽に始めよう。</h1><p>メールアドレスや本名は不要。ユーザー名とパスワードだけで、レシピを記録・共有できます。</p><div className="auth-privacy"><KeyRound size={18} /><span>表示名は後から自由に変更できます。パスワードは安全な形で保存します。</span></div></div><div className="auth-card">{newRecoveryCode ? <><span className="section-kicker">ACCOUNT RECOVERY</span><h2>復旧コードを控えてください</h2><p>メールアドレスを登録しないため、パスワードを忘れたときはこのコードが必要です。登録後は再表示できません。</p><div className="recovery-code"><code>{newRecoveryCode}</code><button type="button" onClick={() => void copyCode()}><Copy size={16} /> {copied ? "コピー済み" : "コピー"}</button></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button auth-submit" onClick={() => location.assign(returnTo)}>控えました。CoffeeMateへ <ArrowRight size={17} /></button></> : <><div className="auth-tabs"><button type="button" className={mode === "login" ? "selected" : ""} onClick={() => selectMode("login")}>ログイン</button><button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => selectMode("signup")}>新規登録</button></div><form onSubmit={(event) => void submit(event)}><label>ユーザー名<input autoFocus required autoComplete="username" maxLength={24} pattern="[A-Za-z0-9_.-]{3,24}" title="英数字・_・.・- の3〜24文字" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="例：coffee_taro" /></label>{mode === "signup" && <small className="auth-help">英数字・_・.・- の3〜24文字。大文字と小文字は同じ名前として扱います。</small>}{mode === "recover" && <label>復旧コード<input required autoComplete="off" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} placeholder="登録時に控えたコード" /></label>}<label>{mode === "recover" ? "新しいパスワード" : "パスワード"}<input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? undefined : 8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "login" ? "パスワード" : "8文字以上のパスワード"} /></label>{mode !== "login" && <small className="auth-help">8〜128文字で入力してください。</small>}{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "処理中..." : mode === "login" ? "ログイン" : mode === "signup" ? "登録する" : "パスワードを再設定"}<ArrowRight size={17} /></button></form><div className="auth-secondary">{mode === "recover" ? <button type="button" onClick={() => selectMode("login")}>ログインに戻る</button> : <button type="button" onClick={() => selectMode("recover")}>パスワードを忘れた場合</button>}</div></>}</div></main></div>;
}
