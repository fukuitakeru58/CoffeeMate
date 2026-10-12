"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, Check, ChevronDown, Clock3, Coffee, Droplets, Heart, LogOut, MessageCircle, Minus, Plus, Search, Share2, SlidersHorizontal, Sparkles, Thermometer, Trash2, UserRound, Users, X } from "lucide-react";

type Step = { time: number; water: number; note: string };
type BrewConditions = { method: string; grinder: string; grind: string; grindClicks: string; dose: number; water: number; temperature: number; steps: Step[] };
type Recipe = {
  id: string; userId: string; authorName: string; title: string; method: string; bean: string; beanId: string | null; roast: string;
  grinder: string; grind: string; grindClicks: string; dose: number; water: number; temperature: number;
  targetTime: number; actualTime: number | null; actualBrew: BrewConditions | null; hypothesis: string; steps: Step[]; tasting: string;
  rating: number | null; visibility: "private" | "public"; createdAt: string; updatedAt: string;
  likeCount: number; commentCount: number; ratingCount: number; averageRating: number | null; userRating: number | null; liked: boolean; saved: boolean;
};
type Draft = Omit<Recipe, "id" | "userId" | "authorName" | "createdAt" | "updatedAt" | "likeCount" | "commentCount" | "ratingCount" | "averageRating" | "userRating" | "liked" | "saved">;
type Comment = { id: string; userId: string; authorName: string; body: string; createdAt: string };
type BeanOption = { id: string; name: string; country: string; region: string; roast: string };
type GrinderOption = { id: string; name: string; maxClicks: number };
type Scope = "feed" | "following" | "mine" | "saved";

const methods = ["ハンドドリップ", "エアロプレス", "フレンチプレス", "エスプレッソ", "水出し"];
const grinders = ["未選択", "Comandante C40", "1Zpresso K-Ultra", "TIMEMORE C3", "Baratza Encore", "Fellow Ode", "その他"];
const grinds = ["極細挽き", "細挽き", "中細挽き", "中挽き", "中粗挽き", "粗挽き"];
const emptyDraft: Draft = {
  title: "", method: "ハンドドリップ", bean: "", beanId: null, roast: "中煎り", grinder: "", grind: "中挽き", grindClicks: "",
  dose: 18, water: 270, temperature: 92, targetTime: 180, actualTime: null, actualBrew: null, hypothesis: "",
  steps: [{ time: 0, water: 40, note: "蒸らし" }, { time: 30, water: 130, note: "1投目" }, { time: 75, water: 270, note: "2投目" }],
  tasting: "", rating: null, visibility: "private",
};

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function formatDate(value: string) { return new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }); }
function ratio(recipe: Pick<Draft, "dose" | "water">) { return `1:${(recipe.water / recipe.dose).toFixed(1)}`; }
function initials(name: string) { return name.slice(0, 1).toUpperCase(); }
function plannedBrew(recipe: BrewConditions): BrewConditions { return { method: recipe.method, grinder: recipe.grinder, grind: recipe.grind, grindClicks: recipe.grindClicks, dose: recipe.dose, water: recipe.water, temperature: recipe.temperature, steps: recipe.steps.map((step) => ({ ...step })) }; }

export default function CoffeeApp({ user }: { user: { id: string; name: string } | null }) {
  const [scope, setScope] = useState<Scope>("feed");
  const [items, setItems] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("すべて");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editorTab, setEditorTab] = useState<"plan" | "result">("plan");
  const [detail, setDetail] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [beanOptions, setBeanOptions] = useState<BeanOption[]>([]);
  const [grinderOptions, setGrinderOptions] = useState<GrinderOption[]>([]);
  const [addingGrinder, setAddingGrinder] = useState(false);
  const [newGrinderName, setNewGrinderName] = useState("");
  const [newGrinderMax, setNewGrinderMax] = useState(60);

  const loadCatalogs = useCallback(async () => {
    if (!user) return;
    const [beanResult, grinderResult] = await Promise.all([fetch("/api/beans"), fetch("/api/grinders")]);
    if (beanResult.ok) setBeanOptions(((await beanResult.json()) as { beans: BeanOption[] }).beans);
    if (grinderResult.ok) setGrinderOptions(((await grinderResult.json()) as { grinders: GrinderOption[] }).grinders);
  }, [user]);

  const load = useCallback(async (nextScope: Scope = scope) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recipes?scope=${nextScope}`);
      const data = await response.json() as { recipes: Recipe[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setItems(data.recipes);
    } catch (error) { setNotice(error instanceof Error ? error.message : "読み込めませんでした"); }
    finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { void load(scope); }, [scope, load]);
  useEffect(() => { void loadCatalogs(); }, [loadCatalogs]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("recipe");
    if (id) void openDetail(id);
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(timer); }, [notice]);

  const visible = useMemo(() => items.filter((item) => {
    const text = `${item.title} ${item.bean} ${item.authorName}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (methodFilter === "すべて" || item.method === methodFilter);
  }), [items, search, methodFilter]);
  const clickMax = grinderOptions.find((item) => item.name === draft.grinder)?.maxClicks ?? 60;
  const clickNumber = Math.min(clickMax, Math.max(0, Number.parseInt(draft.grindClicks, 10) || 0));
  const actualBrew = draft.actualBrew ?? plannedBrew(draft);

  function startNew() { if (!user) { location.href = "/signin-with-chatgpt?return_to=/"; return; } setEditingId(null); setDraft({ ...emptyDraft, steps: emptyDraft.steps.map((step) => ({ ...step })) }); setEditorTab("plan"); setEditorOpen(true); }
  function edit(item: Recipe, tab: "plan" | "result" = "plan") { setEditingId(item.id); setDraft({ title: item.title, method: item.method, bean: item.bean, beanId: item.beanId, roast: item.roast, grinder: item.grinder, grind: item.grind, grindClicks: item.grindClicks, dose: item.dose, water: item.water, temperature: item.temperature, targetTime: item.targetTime, actualTime: item.actualTime, actualBrew: item.actualBrew, hypothesis: item.hypothesis, steps: item.steps, tasting: item.tasting, rating: item.rating, visibility: item.visibility }); setDetail(null); setEditorTab(tab); setEditorOpen(true); }
  function change<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function changeActual<K extends keyof BrewConditions>(key: K, value: BrewConditions[K]) { setDraft((current) => ({ ...current, actualBrew: { ...plannedBrew(current), ...current.actualBrew, [key]: value } })); }

  async function save() {
    setSaving(true);
    try {
      const payload = editorTab === "result" ? { ...draft, actualBrew: draft.actualBrew ?? plannedBrew(draft) } : draft;
      const response = await fetch(editingId ? `/api/recipes/${editingId}` : "/api/recipes", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(data.error);
      setEditorOpen(false); setNotice(draft.visibility === "public" ? "レシピを公開しました" : "レシピを保存しました");
      setScope("mine"); await Promise.all([load("mine"), loadCatalogs()]);
    } catch (error) { setNotice(error instanceof Error ? error.message : "保存できませんでした"); }
    finally { setSaving(false); }
  }

  async function addGrinder() {
    const name = newGrinderName.trim();
    if (!name) { setNotice("ミル名を入力してください"); return; }
    const response = await fetch("/api/grinders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, maxClicks: newGrinderMax }) });
    const data = await response.json() as { grinder?: GrinderOption; error?: string };
    if (!response.ok || !data.grinder) { setNotice(data.error || "追加できませんでした"); return; }
    setGrinderOptions((current) => [...current, data.grinder!]);
    change("grinder", data.grinder.name); setAddingGrinder(false); setNewGrinderName(""); setNotice("ミルを追加しました");
  }

  async function openDetail(id: string) {
    try {
      const response = await fetch(`/api/recipes/${id}`);
      const data = await response.json() as { recipe: Recipe; comments: Comment[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setDetail(data.recipe);
      setComments(data.comments); setCommentText("");
      history.replaceState(null, "", `/?recipe=${encodeURIComponent(id)}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "開けませんでした"); }
  }
  function closeDetail() { setDetail(null); history.replaceState(null, "", "/"); }
  async function interact(item: Recipe, type: "like" | "bookmark") {
    if (!user) { location.href = "/signin-with-chatgpt?return_to=/"; return; }
    const response = await fetch(`/api/recipes/${item.id}/interact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
    if (!response.ok) { setNotice("操作できませんでした"); return; }
    const { active } = await response.json() as { active: boolean };
    setItems((current) => current.map((recipe) => recipe.id === item.id ? { ...recipe, [type === "like" ? "liked" : "saved"]: active, likeCount: type === "like" ? recipe.likeCount + (active ? 1 : -1) : recipe.likeCount } : recipe));
    setDetail((current) => current?.id === item.id ? { ...current, [type === "like" ? "liked" : "saved"]: active, likeCount: type === "like" ? current.likeCount + (active ? 1 : -1) : current.likeCount } : current);
  }
  async function postComment() {
    if (!detail || !commentText.trim()) return;
    if (!user) { location.href = "/signin-with-chatgpt?return_to=/"; return; }
    const response = await fetch(`/api/recipes/${detail.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: commentText }) });
    const data = await response.json() as { comment: Comment; error?: string };
    if (!response.ok) { setNotice(data.error || "コメントできませんでした"); return; }
    setComments((current) => [...current, data.comment]); setCommentText("");
    setItems((current) => current.map((item) => item.id === detail.id ? { ...item, commentCount: item.commentCount + 1 } : item));
  }
  async function rate(item: Recipe, score: number) {
    if (!user) { location.href = "/signin-with-chatgpt?return_to=/"; return; }
    const response = await fetch(`/api/recipes/${item.id}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score }) });
    if (!response.ok) { setNotice("評価できませんでした"); return; }
    await openDetail(item.id); await load(scope); setNotice("評価を記録しました");
  }
  async function share(item: Recipe, platform: "native" | "x" | "instagram" = "native") {
    if (item.visibility !== "public") { setNotice("共有するにはレシピを一般公開にしてください"); return; }
    const url = `${location.origin}/?recipe=${encodeURIComponent(item.id)}`;
    if (platform === "x") { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${item.title}｜CoffeeMate`)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer"); return; }
    if (platform === "native" && navigator.share) { try { await navigator.share({ title: item.title, url }); } catch { /* user cancelled */ } return; }
    try {
      await navigator.clipboard.writeText(url);
      setNotice(platform === "instagram" ? "リンクをコピーしました。Instagramの投稿やストーリーズに貼り付けてください" : "共有リンクをコピーしました");
    } catch { setNotice("リンクをコピーできませんでした。ブラウザーの共有機能をご利用ください"); }
  }
  async function remove(item: Recipe) {
    if (!confirm("このレシピを削除しますか？")) return;
    const response = await fetch(`/api/recipes/${item.id}`, { method: "DELETE" });
    if (!response.ok) { setNotice("削除できませんでした"); return; }
    closeDetail(); setNotice("レシピを削除しました"); await load(scope);
  }

  const scopeTitle: Record<Scope, string> = { feed: "みんなのレシピ", following: "フォロー中", mine: "マイレシピ", saved: "保存したレシピ" };
  const scopeDescription: Record<Scope, string> = { feed: "誰かのこだわりから、新しい淹れ方を見つけよう。", following: "フォローした作成者の公開レシピをまとめて。", mine: "試行錯誤の記録を、ここに。", saved: "また試したいレシピを、いつでも。" };
  const emptyTitle = search || methodFilter !== "すべて" ? "条件に合うレシピはまだありません" : { feed: "最初のレシピを待っています", following: "フォロー中のレシピはまだありません", mine: "最初の一杯を記録しましょう", saved: "保存したレシピはまだありません" }[scope];
  const emptyDescription = { feed: "淹れ方のひらめきや、実際に飲んだ感想を共有してみましょう。", following: "気になる作成者をフォローすると、その人の公開レシピがここに並びます。", mine: "抽出前の狙いと抽出後の感想を分けて残せます。", saved: "気になるレシピのブックマークを押すと、ここに並びます。" }[scope];

  return <div className="site-shell">
    <header className="site-header"><div className="header-inner">
      <button className="brand" onClick={() => setScope("feed")} aria-label="CoffeeMate ホーム"><span className="brand-mark"><Coffee size={22} strokeWidth={2.1} /></span><span>Coffee<span className="brand-accent">Mate</span></span></button>
      <nav className="top-nav" aria-label="メインメニュー"><button className={scope === "feed" ? "active" : ""} onClick={() => setScope("feed")}>みんなのレシピ</button><button className={scope === "following" ? "active" : ""} onClick={() => user ? setScope("following") : location.href = "/signin-with-chatgpt?return_to=/"}>フォロー中</button><button className={scope === "mine" ? "active" : ""} onClick={() => user ? setScope("mine") : location.href = "/signin-with-chatgpt?return_to=/"}>マイレシピ</button><button className={scope === "saved" ? "active" : ""} onClick={() => user ? setScope("saved") : location.href = "/signin-with-chatgpt?return_to=/"}>保存したレシピ</button><a href="/beans">コーヒー豆</a>{user && <a href={`/users/${encodeURIComponent(user.id)}`}>マイページ</a>}</nav>
      <div className="header-actions">{user ? <><a className="user-chip" href={`/users/${encodeURIComponent(user.id)}`} aria-label="マイページを開く"><span className="avatar small">{initials(user.name)}</span><span className="user-name">{user.name}</span></a><a className="logout-link" href="/signout-with-chatgpt?return_to=%2F" target="_top"><LogOut size={15} /> ログアウト</a></> : <a className="login-link" href="/signin-with-chatgpt?return_to=/" target="_top">ログイン</a>}<button className="primary-button header-create" onClick={startNew}><Plus size={17} /> レシピを作成</button></div>
    </div></header>

    <main className="main-wrap">
      <section className="hero"><div className="hero-content"><span className="eyebrow"><span className="eyebrow-dot" /> BREW NOTEBOOK & COMMUNITY</span><h1>一杯を、<br /><em>もっと自分らしく。</em></h1><p>ひらめきをレシピに。淹れたあとの気づきを、次の一杯へ。<br className="desktop-break" />あなたのコーヒーの記録が、誰かの「おいしい」につながる。</p><div className="hero-actions"><button className="primary-button hero-button" onClick={startNew}>最初のレシピを記録する <span>↗</span></button><span>設計から感想まで、ひとつの場所に。</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="coffee-cup"><div className="coffee-surface" /><div className="latte-swirl swirl-one" /><div className="latte-swirl swirl-two" /><div className="cup-shine" /></div><div className="cup-handle" /><div className="art-caption">GOOD COFFEE<br />BEGINS HERE.</div></div></section>

      <div className="content-grid"><aside className="sidebar"><p className="side-label">EXPLORE</p><button className={`side-link ${scope === "feed" ? "selected" : ""}`} onClick={() => setScope("feed")}><Coffee size={18} /> みんなのレシピ</button><button className={`side-link ${scope === "following" ? "selected" : ""}`} onClick={() => user ? setScope("following") : location.href = "/signin-with-chatgpt?return_to=/"}><Users size={18} /> フォロー中</button><button className={`side-link ${scope === "mine" ? "selected" : ""}`} onClick={() => user ? setScope("mine") : location.href = "/signin-with-chatgpt?return_to=/"}><SlidersHorizontal size={18} /> マイレシピ</button><button className={`side-link ${scope === "saved" ? "selected" : ""}`} onClick={() => user ? setScope("saved") : location.href = "/signin-with-chatgpt?return_to=/"}><Bookmark size={18} /> 保存したレシピ</button><a className="side-link" href="/beans"><Coffee size={18} /> コーヒー豆</a>{user && <a className="side-link" href={`/users/${encodeURIComponent(user.id)}`}><UserRound size={18} /> マイページ</a>}<div className="sidebar-note"><span className="note-icon"><Sparkles size={19} /></span><strong>おいしさのヒントを<br />残しておこう。</strong><p>「こうなるはず」と「実際はどうだった？」を分けて記録すると、次の一杯がもっと楽しく。</p><button onClick={startNew}>レシピを書く →</button></div></aside>

      <section className="feed"><div className="section-heading"><div><span className="section-kicker">DISCOVER YOUR NEXT CUP</span><h2>{scopeTitle[scope]}</h2><p>{scopeDescription[scope]}</p></div><button className="outline-button new-inline" onClick={startNew}><Plus size={16} /> 新しいレシピ</button></div>
        <div className="feed-tools"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="豆・レシピ・ユーザーを検索" /></label><div className="filter-scroll">{["すべて", ...methods].map((method) => <button key={method} className={`filter-pill ${methodFilter === method ? "selected" : ""}`} onClick={() => setMethodFilter(method)}>{method}</button>)}</div></div>
        {loading ? <div className="loading-grid"><div /><div /><div /></div> : visible.length ? <div className="recipe-grid">{visible.map((item, index) => <article className="recipe-card" key={item.id}><button className={`recipe-art art-${index % 4}`} onClick={() => void openDetail(item.id)} aria-label={`${item.title}を開く`}><span className="recipe-method">{item.method}</span><span className="recipe-art-bean">{(item.bean || "豆未設定").slice(0, 14)}</span><span className="art-coffee-dot" /></button><div className="recipe-body"><div className="recipe-meta"><span className="avatar">{initials(item.authorName)}</span><a className="author-name" href={`/users/${encodeURIComponent(item.userId)}`}>{item.authorName}</a><span className="meta-dot">·</span><time>{formatDate(item.createdAt)}</time>{item.visibility === "private" && <span className="private-tag">非公開</span>}</div><button className="recipe-title" onClick={() => void openDetail(item.id)}>{item.title}</button><p className="recipe-bean">{item.bean || "豆未設定"} <span>·</span> {item.roast}</p><div className="recipe-stats"><span><Coffee size={15} /> {item.dose}g</span><span><Droplets size={15} /> {item.water}ml</span><span><Thermometer size={15} /> {item.temperature}℃</span><span><Clock3 size={15} /> {formatTime(item.targetTime)}</span></div>{item.hypothesis && <p className="recipe-excerpt">{item.hypothesis}</p>}<div className="card-footer"><button className={item.liked ? "engaged" : ""} onClick={() => void interact(item, "like")} aria-label="いいね"><Heart size={17} fill={item.liked ? "currentColor" : "none"} /> {item.likeCount}</button><button onClick={() => void openDetail(item.id)} aria-label="コメント"><MessageCircle size={17} /> {item.commentCount}</button><button className={item.saved ? "engaged" : ""} onClick={() => void interact(item, "bookmark")} aria-label="保存"><Bookmark size={17} fill={item.saved ? "currentColor" : "none"} /></button><button onClick={() => void share(item)} aria-label="共有"><Share2 size={17} /></button></div></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Coffee size={31} /></div><h3>{emptyTitle}</h3><p>{emptyDescription}</p>{scope === "following" ? <button className="primary-button" onClick={() => setScope("feed")}>みんなのレシピを見る</button> : scope !== "saved" && <button className="primary-button" onClick={startNew}><Plus size={17} /> レシピを作成</button>}</div>}
      </section><aside className="right-rail"><div className="rail-card"><span className="rail-label">BREW BETTER</span><h3>一杯の設計図を<br />つくろう。</h3><p>豆、挽き目、湯温、注ぎ方。小さな調整を残せば、好みの味に少しずつ近づけます。</p><div className="rail-rule" /><div className="rail-mini"><span>01</span><div><strong>抽出前の仮説</strong><small>狙う味とレシピを決める</small></div></div><div className="rail-mini"><span>02</span><div><strong>抽出後の感想</strong><small>結果を振り返って次へ</small></div></div></div><div className="rail-quote">“ 最高の一杯は、<br />きっと一度では<br />できないから。 ”</div></aside></div>
    </main>

    {editorOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false); }}><div className="editor-panel" role="dialog" aria-modal="true" aria-label="レシピを編集"><div className="panel-header"><div><span className="panel-kicker">BREW JOURNAL</span><h2>{editingId ? "レシピを編集" : "新しいレシピ"}</h2></div><button className="icon-button" onClick={() => setEditorOpen(false)} aria-label="閉じる"><X size={21} /></button></div><div className="editor-tabs"><button className={editorTab === "plan" ? "selected" : ""} onClick={() => setEditorTab("plan")}><span>01</span> 抽出前の設計</button><button className={editorTab === "result" ? "selected" : ""} onClick={() => setEditorTab("result")}><span>02</span> 抽出後の記録</button></div><div className="editor-scroll">{editorTab === "plan" ? <>
      <div className="editor-intro"><span className="intro-icon"><Sparkles size={21} /></span><div><strong>今日はどんな一杯を淹れたい？</strong><p>まずは狙う味と抽出の条件を決めましょう。</p></div></div>
      <div className="field-group">
        <label>レシピの名前 <span className="optional-tag">任意・空欄なら日付＋連番</span><input value={draft.title} onChange={(event) => change("title", event.target.value)} placeholder="例：朝のやさしいエチオピア" maxLength={100} /></label>
        <div className="bean-field"><label htmlFor="bean-name">コーヒー豆 <span className="optional-tag">任意</span></label><input id="bean-name" value={draft.bean} onChange={(event) => setDraft((current) => ({ ...current, bean: event.target.value, beanId: null }))} placeholder="例：エチオピア イルガチェフェ" maxLength={100} />
          {!draft.beanId && draft.bean.trim() && <div className="bean-suggestions">{beanOptions.filter((bean) => bean.name.toLocaleLowerCase().includes(draft.bean.toLocaleLowerCase())).slice(0, 5).map((bean) => <button key={bean.id} onClick={() => setDraft((current) => ({ ...current, bean: bean.name, beanId: bean.id, roast: bean.roast || current.roast }))}><Coffee size={15} /><span>{bean.name}<small>{[bean.country, bean.region].filter(Boolean).join(" · ")}</small></span><Check size={14} /></button>)}</div>}
          {draft.beanId ? <a className="bean-help-link" href={`/beans/${draft.beanId}`} target="_blank" rel="noopener noreferrer">豆ページを開く ↗</a> : <small className="bean-help">{draft.bean.trim() ? "保存すると、この豆のページを自動で作成します。" : "豆が決まっていなくても保存できます。"}</small>}
        </div>
      </div>
      <div className="field-row"><label>抽出方法 <span className="select-wrap"><select value={draft.method} onChange={(event) => change("method", event.target.value)}>{methods.map((method) => <option key={method}>{method}</option>)}</select><ChevronDown size={16} /></span></label><label>焙煎度 <span className="select-wrap"><select value={draft.roast} onChange={(event) => change("roast", event.target.value)}>{["浅煎り", "中浅煎り", "中煎り", "中深煎り", "深煎り"].map((roast) => <option key={roast}>{roast}</option>)}</select><ChevronDown size={16} /></span></label></div>
      <div className="editor-section-title"><span>01</span><div><h3>挽き目を決める</h3><p>ミルを選んでから、クリック数と粒度を調整</p></div></div>
      <div className="field-row"><label>使用するミル <span className="select-wrap"><select value={draft.grinder} onChange={(event) => change("grinder", event.target.value)}><option value="">未選択</option>{grinders.filter((name) => name !== "未選択" && name !== "その他").map((name) => <option key={name} value={name}>{name}</option>)}{grinderOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}{draft.grinder && !grinders.includes(draft.grinder) && !grinderOptions.some((item) => item.name === draft.grinder) && <option value={draft.grinder}>{draft.grinder}</option>}</select><ChevronDown size={16} /></span></label><div className="click-field"><span>クリック数</span><div className="click-stepper"><button onClick={() => change("grindClicks", String(Math.max(0, clickNumber - 1)))} aria-label="クリック数を減らす"><Minus size={16} /></button><input type="number" min="0" max={clickMax} value={draft.grindClicks} onChange={(event) => change("grindClicks", event.target.value)} placeholder="0" aria-label="クリック数" /><small>clicks</small><button onClick={() => change("grindClicks", String(Math.min(clickMax, clickNumber + 1)))} aria-label="クリック数を増やす"><Plus size={16} /></button></div></div></div>
      <div className="click-range"><span>細かい</span><input type="range" min="0" max={clickMax} value={clickNumber} onChange={(event) => change("grindClicks", event.target.value)} aria-label="クリック数をスライダーで調整" /><span>粗い</span></div><div className="click-quick">{[12, 18, 24, 30].filter((value) => value <= clickMax).map((value) => <button key={value} onClick={() => change("grindClicks", String(value))}>{value} clicks</button>)}<button className="add-grinder-link" onClick={() => setAddingGrinder(!addingGrinder)}><Plus size={14} /> ミルを追加</button></div>
      {addingGrinder && <div className="add-grinder-form"><label>ミル名<input value={newGrinderName} onChange={(event) => setNewGrinderName(event.target.value)} placeholder="例：1Zpresso X-Ultra" maxLength={80} /></label><label>クリック数の上限<input type="number" min="10" max="300" value={newGrinderMax} onChange={(event) => setNewGrinderMax(Number(event.target.value))} /></label><button onClick={() => void addGrinder()}>追加して選択</button></div>}
      <div className="grind-picker" role="group" aria-label="挽き目">{grinds.map((grind) => <button key={grind} className={draft.grind === grind ? "selected" : ""} onClick={() => change("grind", grind)}>{grind}</button>)}</div>
      <div className="editor-section-title"><span>02</span><div><h3>抽出条件を整える</h3><p>数字を直接入力するか、つまみで調整</p></div></div><div className="adjust-grid"><Adjust label="豆の量" unit="g" value={draft.dose} min={5} max={60} step={0.1} icon={<Coffee size={19} />} onChange={(value) => change("dose", value)} /><Adjust label="お湯の量" unit="ml" value={draft.water} min={50} max={1000} step={1} icon={<Droplets size={19} />} onChange={(value) => change("water", value)} /><Adjust label="湯温" unit="℃" value={draft.temperature} min={40} max={100} step={0.5} icon={<Thermometer size={19} />} onChange={(value) => change("temperature", value)} /></div><div className="ratio-strip"><span>抽出比率</span><strong>{ratio(draft)}</strong><small>豆 {draft.dose}g : お湯 {draft.water}ml</small></div>
      <div className="editor-section-title"><span>03</span><div><h3>注ぎ方と狙い</h3><p>抽出の流れと、味の仮説を記録</p></div></div><label className="single-field">目標抽出時間 <span className="time-input"><Clock3 size={17} /><input type="number" min="0" max="60" value={Math.floor(draft.targetTime / 60)} onChange={(event) => change("targetTime", Number(event.target.value) * 60 + draft.targetTime % 60)} /> 分 <input type="number" min="0" max="59" value={draft.targetTime % 60} onChange={(event) => change("targetTime", Math.floor(draft.targetTime / 60) * 60 + Number(event.target.value))} /> 秒</span></label><div className="steps-heading"><span>注湯ステップ</span><button onClick={() => change("steps", [...draft.steps, { time: 0, water: draft.water, note: "" }])}><Plus size={15} /> ステップ追加</button></div><div className="steps-list">{draft.steps.map((step, index) => <div className="step-row" key={index}><span className="step-index">{String(index + 1).padStart(2, "0")}</span><label><input type="number" min="0" value={step.time} onChange={(event) => change("steps", draft.steps.map((item, i) => i === index ? { ...item, time: Number(event.target.value) } : item))} /> 秒</label><label><input type="number" min="0" value={step.water} onChange={(event) => change("steps", draft.steps.map((item, i) => i === index ? { ...item, water: Number(event.target.value) } : item))} /> mlまで</label><input className="step-note" value={step.note} onChange={(event) => change("steps", draft.steps.map((item, i) => i === index ? { ...item, note: event.target.value } : item))} placeholder="蒸らし・1投目など" /><button className="step-delete" onClick={() => change("steps", draft.steps.filter((_, i) => i !== index))} aria-label="ステップを削除"><X size={15} /></button></div>)}</div><label className="single-field">抽出前の仮説・狙う味<textarea value={draft.hypothesis} onChange={(event) => change("hypothesis", event.target.value)} placeholder="例：湯温を少し下げて、酸味をやわらかく出したい。" rows={4} /></label>
      </> : <><div className="editor-intro result-intro"><span className="intro-icon"><Check size={21} /></span><div><strong>淹れてみて、どうだった？</strong><p>計画と実際の違い、味の印象を残しましょう。</p></div></div><ActualBrewEditor brew={actualBrew} grinders={grinderOptions} onChange={changeActual} onReset={() => change("actualBrew", plannedBrew(draft))} /><label className="single-field">実際の抽出時間 <span className="time-input"><Clock3 size={17} /><input type="number" min="0" max="60" value={draft.actualTime === null ? "" : Math.floor(draft.actualTime / 60)} onChange={(event) => change("actualTime", Number(event.target.value) * 60 + (draft.actualTime || 0) % 60)} placeholder="分" /> 分 <input type="number" min="0" max="59" value={draft.actualTime === null ? "" : draft.actualTime % 60} onChange={(event) => change("actualTime", Math.floor((draft.actualTime || 0) / 60) * 60 + Number(event.target.value))} placeholder="秒" /> 秒</span></label><div className="rating-box"><span>この一杯の評価</span><div className="rating-buttons">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} className={draft.rating === rating ? "selected" : ""} onClick={() => change("rating", rating)} aria-label={`${rating}点`}>{rating}</button>)}</div><small>あとから追記しても大丈夫です</small></div><label className="single-field">味わい・気づいたこと<textarea value={draft.tasting} onChange={(event) => change("tasting", event.target.value)} placeholder="例：柑橘のような明るい酸味。後味は軽く、少し薄く感じたので次回は挽き目を細かくしたい。" rows={6} /></label><div className="reflection-tip"><Sparkles size={18} /><p>「次は何を変えるか」まで書いておくと、次回のレシピづくりがスムーズになります。</p></div></>}
    </div><div className="editor-footer"><label className="visibility-toggle"><input type="checkbox" checked={draft.visibility === "public"} onChange={(event) => change("visibility", event.target.checked ? "public" : "private")} /><span className="toggle-track" /><span><strong>{draft.visibility === "public" ? "一般公開" : "非公開で保存"}</strong><small>{draft.visibility === "public" ? "サイト全体の公開後に閲覧・共有できます" : "自分だけが閲覧できます"}</small></span></label><button className="primary-button" onClick={() => void save()} disabled={saving}>{saving ? "保存中..." : editorTab === "result" ? "実際の記録を保存" : editingId ? "変更を保存" : draft.visibility === "public" ? "公開する" : "保存する"} <span>↗</span></button></div></div></div>}

    {detail && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}><div className="detail-panel" role="dialog" aria-modal="true" aria-label={detail.title}><button className="detail-close icon-button" onClick={closeDetail} aria-label="閉じる"><X size={20} /></button><div className="detail-hero"><span>{detail.method}</span><div className="detail-cup" /><p>BREW RECIPE / COFFEEMATE</p></div><div className="detail-body"><div className="detail-author"><span className="avatar">{initials(detail.authorName)}</span><a className="detail-author-link" href={`/users/${encodeURIComponent(detail.userId)}`}>{detail.authorName}</a><span>·</span><time>{formatDate(detail.createdAt)}</time>{detail.visibility === "private" && <span className="private-tag">非公開</span>}</div><h2>{detail.title}</h2><p className="detail-bean">{detail.beanId && detail.userId === user?.id ? <a href={"/beans/" + detail.beanId}>{detail.bean || "豆未設定"} ↗</a> : detail.bean || "豆未設定"} · {detail.roast}</p><div className="detail-stat-grid"><div><Coffee size={18} /><small>豆</small><strong>{detail.dose}g</strong></div><div><Droplets size={18} /><small>お湯</small><strong>{detail.water}ml</strong></div><div><Thermometer size={18} /><small>湯温</small><strong>{detail.temperature}℃</strong></div><div><Clock3 size={18} /><small>目標時間</small><strong>{formatTime(detail.targetTime)}</strong></div></div><div className="detail-section"><span>BEFORE BREWING</span><h3>抽出前の設計</h3><p>{detail.hypothesis || "仮説はまだ記録されていません。"}</p><div className="detail-facts"><span>ミル <strong>{detail.grinder || "未設定"}</strong></span><span>挽き目 <strong>{detail.grind}{detail.grindClicks && ` / ${detail.grindClicks}`}</strong></span><span>抽出比率 <strong>{ratio(detail)}</strong></span></div>{detail.steps.length > 0 && <div className="detail-steps">{detail.steps.map((step, index) => <div key={index}><span>{formatTime(step.time)}</span><strong>{step.water}ml</strong><p>{step.note}</p></div>)}</div>}</div><div className="detail-section after"><span>AFTER BREWING</span><h3>抽出後の記録</h3>{detail.actualBrew ? <ActualBrewDetail brew={detail.actualBrew} /> : <p className="actual-empty">実際の条件はまだ記録されていません。</p>}<p>{detail.tasting || "感想はまだ記録されていません。"}</p>{detail.actualTime !== null && <small>実際の抽出時間：{formatTime(detail.actualTime)}</small>}{detail.rating && <div className="detail-rating">{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < detail.rating! ? "filled" : ""}>★</span>)}</div>}</div><div className="detail-actions"><button onClick={() => void interact(detail, "like")} className={detail.liked ? "engaged" : ""}><Heart size={18} fill={detail.liked ? "currentColor" : "none"} /> いいね</button><button onClick={() => void interact(detail, "bookmark")} className={detail.saved ? "engaged" : ""}><Bookmark size={18} fill={detail.saved ? "currentColor" : "none"} /> 保存</button><button onClick={() => void share(detail)}><Share2 size={18} /> 共有</button></div><div className="share-row"><button onClick={() => void share(detail, "x")}>Xで共有 ↗</button><button onClick={() => void share(detail, "instagram")}>Instagram用にリンクをコピー ↗</button></div><div className="community-rating"><div><strong>みんなの評価</strong><span>{detail.averageRating ? detail.averageRating.toFixed(1) + " / 5" : "まだ評価はありません"} {detail.ratingCount > 0 && "(" + detail.ratingCount + "件)"}</span></div><div className="community-stars">{[1, 2, 3, 4, 5].map((score) => <button key={score} className={detail.userRating !== null && score <= detail.userRating ? "selected" : ""} onClick={() => void rate(detail, score)} disabled={detail.visibility !== "public"} aria-label={score + "点で評価"}>★</button>)}</div><small>星を選んでこのレシピを評価</small></div>{detail.userId === user?.id && <div className="owner-actions"><button onClick={() => edit(detail)}>抽出前の設計を編集</button><button onClick={() => edit(detail, "result")}>抽出後の記録を編集</button><button onClick={() => void remove(detail)}><Trash2 size={15} /> 削除</button></div>}<div className="comments-section"><h3>コメント <span>{comments.length}</span></h3>{comments.map((comment) => <div className="comment" key={comment.id}><span className="avatar small">{initials(comment.authorName)}</span><div><a className="comment-author-link" href={`/users/${encodeURIComponent(comment.userId)}`}>{comment.authorName}</a><time>{formatDate(comment.createdAt)}</time><p>{comment.body}</p></div></div>)}<div className="comment-form"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="このレシピへの感想や質問をどうぞ" rows={3} /><button className="primary-button" onClick={() => void postComment()} disabled={!commentText.trim()}>コメントする</button></div></div></div></div></div>}
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>;
}

function Adjust({ label, unit, value, min, max, step, icon, onChange }: { label: string; unit: string; value: number; min: number; max: number; step: number; icon: React.ReactNode; onChange: (value: number) => void }) {
  const [textValue, setTextValue] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setTextValue(String(value)); }, [value, editing]);
  const clamp = (next: number) => Math.min(max, Math.max(min, Number((Math.round(next / step) * step).toFixed(2))));
  return <div className="adjust-card"><div className="adjust-top"><span>{icon}</span><label>{label}</label></div><div className="adjust-value"><button onClick={() => onChange(clamp(value - step))} aria-label={`${label}を減らす`}><Minus size={15} /></button><span><input type="number" min={min} max={max} step={step} value={textValue} onFocus={() => setEditing(true)} onChange={(event) => { const next = event.target.value; setTextValue(next); const parsed = Number(next); if (next !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed); }} onBlur={() => { setEditing(false); const parsed = Number(textValue); onChange(textValue !== "" && Number.isFinite(parsed) ? clamp(parsed) : value); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label={label} /><small>{unit}</small></span><button onClick={() => onChange(clamp(value + step))} aria-label={`${label}を増やす`}><Plus size={15} /></button></div><input className="adjust-slider" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /></div>;
}

function ActualBrewEditor({ brew, grinders: customGrinders, onChange, onReset }: { brew: BrewConditions; grinders: GrinderOption[]; onChange: <K extends keyof BrewConditions>(key: K, value: BrewConditions[K]) => void; onReset: () => void }) {
  const clickMax = customGrinders.find((item) => item.name === brew.grinder)?.maxClicks ?? 60;
  const clicks = Math.min(clickMax, Math.max(0, Number.parseInt(brew.grindClicks, 10) || 0));
  return <section className="actual-brew-editor">
    <div className="actual-brew-heading"><div><span>ACTUAL BREW</span><h3>実際に使った条件</h3><p>設計した値が入っています。変えたところだけ直してください。</p></div><button type="button" onClick={onReset}>設計値に戻す</button></div>
    <div className="field-row"><label>抽出方法<span className="select-wrap"><select value={brew.method} onChange={(event) => onChange("method", event.target.value)}>{methods.map((method) => <option key={method}>{method}</option>)}</select><ChevronDown size={16} /></span></label><label>使用したミル<span className="select-wrap"><select value={brew.grinder} onChange={(event) => onChange("grinder", event.target.value)}><option value="">未選択</option>{grinders.filter((name) => name !== "未選択" && name !== "その他").map((name) => <option key={name}>{name}</option>)}{customGrinders.map((item) => <option key={item.id}>{item.name}</option>)}{brew.grinder && !grinders.includes(brew.grinder) && !customGrinders.some((item) => item.name === brew.grinder) && <option>{brew.grinder}</option>}</select><ChevronDown size={16} /></span></label></div>
    <div className="actual-grind-row"><span>クリック数</span><div className="click-stepper"><button type="button" onClick={() => onChange("grindClicks", String(Math.max(0, clicks - 1)))} aria-label="実際のクリック数を減らす"><Minus size={16} /></button><input type="number" min="0" max={clickMax} step="1" value={brew.grindClicks} onChange={(event) => onChange("grindClicks", event.target.value)} placeholder="0" aria-label="実際のクリック数" /><small>clicks</small><button type="button" onClick={() => onChange("grindClicks", String(Math.min(clickMax, clicks + 1)))} aria-label="実際のクリック数を増やす"><Plus size={16} /></button></div></div>
    <div className="grind-picker" role="group" aria-label="実際の挽き目">{grinds.map((grind) => <button key={grind} type="button" className={brew.grind === grind ? "selected" : ""} onClick={() => onChange("grind", grind)}>{grind}</button>)}</div>
    <div className="adjust-grid actual-adjust-grid"><Adjust label="豆の量" unit="g" value={brew.dose} min={5} max={60} step={0.1} icon={<Coffee size={19} />} onChange={(value) => onChange("dose", value)} /><Adjust label="お湯の量" unit="ml" value={brew.water} min={50} max={1000} step={1} icon={<Droplets size={19} />} onChange={(value) => onChange("water", value)} /><Adjust label="湯温" unit="℃" value={brew.temperature} min={40} max={100} step={0.5} icon={<Thermometer size={19} />} onChange={(value) => onChange("temperature", value)} /></div>
    <div className="steps-heading"><span>実際の注湯ステップ</span><button type="button" onClick={() => onChange("steps", [...brew.steps, { time: 0, water: brew.water, note: "" }])}><Plus size={15} /> ステップ追加</button></div><div className="steps-list">{brew.steps.map((step, index) => <div className="step-row" key={index}><span className="step-index">{String(index + 1).padStart(2, "0")}</span><label><input type="number" min="0" value={step.time} onChange={(event) => onChange("steps", brew.steps.map((item, i) => i === index ? { ...item, time: Number(event.target.value) } : item))} /> 秒</label><label><input type="number" min="0" value={step.water} onChange={(event) => onChange("steps", brew.steps.map((item, i) => i === index ? { ...item, water: Number(event.target.value) } : item))} /> mlまで</label><input className="step-note" value={step.note} onChange={(event) => onChange("steps", brew.steps.map((item, i) => i === index ? { ...item, note: event.target.value } : item))} placeholder="蒸らし・1投目など" /><button type="button" className="step-delete" onClick={() => onChange("steps", brew.steps.filter((_, i) => i !== index))} aria-label="実際のステップを削除"><X size={15} /></button></div>)}</div>
  </section>;
}

function ActualBrewDetail({ brew }: { brew: BrewConditions }) {
  return <div className="actual-brew-detail"><div className="actual-facts"><span>方法 <strong>{brew.method}</strong></span><span>ミル <strong>{brew.grinder || "未設定"}</strong></span><span>挽き目 <strong>{brew.grind}{brew.grindClicks ? ` / ${brew.grindClicks} clicks` : ""}</strong></span></div><div className="actual-metrics"><span>豆 <strong>{brew.dose}g</strong></span><span>お湯 <strong>{brew.water}ml</strong></span><span>湯温 <strong>{brew.temperature}℃</strong></span></div>{brew.steps.length > 0 && <div className="detail-steps">{brew.steps.map((step, index) => <div key={index}><span>{formatTime(step.time)}</span><strong>{step.water}ml</strong><p>{step.note}</p></div>)}</div>}</div>;
}



