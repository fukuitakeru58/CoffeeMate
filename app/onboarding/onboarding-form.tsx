"use client";

import { useState } from "react";
import { ArrowRight, Coffee, LogOut, UserRound } from "lucide-react";

export default function OnboardingForm({ defaultName, returnTo }: { defaultName: string; returnTo: string }) {
  const [displayName, setDisplayName] = useState(defaultName.slice(0, 40));
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) { setError("表示名を入力してください"); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, bio }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "マイページを作成できませんでした");
      location.assign(returnTo);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "マイページを作成できませんでした"); setSaving(false); }
  }

  return <div className="site-shell onboarding-page"><header className="site-header"><div className="header-inner"><a className="brand" href="/"><span className="brand-mark"><Coffee size={22} /></span><span>Coffee<span className="brand-accent">Mate</span></span></a><div className="header-actions"><a className="logout-link" href="/signout-with-chatgpt?return_to=%2F" target="_top"><LogOut size={15} /> ログアウト</a></div></div></header><main className="onboarding-wrap"><div className="onboarding-aside"><span className="eyebrow">WELCOME TO COFFEEMATE</span><h1>あなたの<br /><em>コーヒーの居場所。</em></h1><p>お気に入りの一杯も、試行錯誤の記録も。まずは、みんなに見える表示名を決めましょう。</p><div className="onboarding-art"><Coffee size={84} strokeWidth={1.3} /></div></div><form className="onboarding-card" onSubmit={(event) => void submit(event)}><span className="section-kicker">STEP 01 / YOUR PROFILE</span><div className="onboarding-icon"><UserRound size={24} /></div><h2>マイページを作成</h2><p>表示名は後からいつでも変更できます。</p><label>表示名 <strong>必須</strong><input autoFocus required maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="表示名を入力" /></label><small>ChatGPTの登録名を初期値にしています。ニックネームに変更できます。</small><label>自己紹介 <span>任意</span><textarea maxLength={500} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="好きな豆や淹れ方など、自由にどうぞ" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={saving || !displayName.trim()}>{saving ? "作成中..." : "マイページを作成"}<ArrowRight size={17} /></button></form></main></div>;
}
