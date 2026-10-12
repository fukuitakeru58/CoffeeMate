"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, Check, ChevronDown, Clock3, Coffee, Droplets, Heart, ImagePlus, LogOut, MessageCircle, Minus, Plus, Search, Share2, SlidersHorizontal, Sparkles, Thermometer, Trash2, UserRound, Users, X } from "lucide-react";
import TimePicker from "./time-picker";
import ReportButton from "./report-button";
import RecipeBadges from "./recipe-badges";
import DripperPicker, { type DripperOption } from "./dripper-picker";
import { DRIPPER_CATALOG } from "../lib/dripper-catalog";

type Step = { time: number; water: number; note: string };
type BrewConditions = { method: string; grinder: string; grind: string; grindClicks: string; dose: number; water: number; temperature: number; steps: Step[] };
type Recipe = {
  id: string; userId: string; authorName: string; title: string; method: string; serving: "hot" | "iced" | ""; bean: string; beanId: string | null; beanCountry: string; dripper: string; dripperId: string | null; imageKey: string | null; roast: string;
  grinder: string; grind: string; grindClicks: string; dose: number; water: number; temperature: number;
  targetTime: number; actualTime: number | null; actualBrew: BrewConditions | null; hypothesis: string; steps: Step[]; tasting: string;
  rating: number | null; visibility: "private" | "public"; moderationStatus: "visible" | "hidden"; createdAt: string; updatedAt: string;
  likeCount: number; commentCount: number; liked: boolean; saved: boolean; saveNote: string | null;
};
type Draft = Omit<Recipe, "id" | "userId" | "authorName" | "imageKey" | "beanCountry" | "createdAt" | "updatedAt" | "moderationStatus" | "likeCount" | "commentCount" | "liked" | "saved" | "saveNote">;
type Comment = { id: string; userId: string; authorName: string; body: string; createdAt: string };
type BeanOption = { id: string; name: string; country: string; region: string; roast: string };
type GrinderOption = { id: string; name: string; maxClicks: number };
type Scope = "feed" | "following" | "mine" | "saved";

const methods = ["ハンドドリップ", "エアロプレス", "フレンチプレス", "エスプレッソ", "水出し"];
const grinders = ["未選択", "Comandante C40", "1Zpresso K-Ultra", "TIMEMORE C3", "Baratza Encore", "Fellow Ode", "その他"];
const grinds = ["極細挽き", "細挽き", "中細挽き", "中挽き", "中粗挽き", "粗挽き"];
const emptyDraft: Draft = {
  title: "", method: "ハンドドリップ", serving: "hot", bean: "", beanId: null, dripper: "", dripperId: null, roast: "中煎り", grinder: "", grind: "中挽き", grindClicks: "",
  dose: 18, water: 270, temperature: 92, targetTime: 180, actualTime: null, actualBrew: null, hypothesis: "",
  steps: [{ time: 0, water: 40, note: "蒸らし" }, { time: 30, water: 130, note: "1投目" }, { time: 75, water: 270, note: "2投目" }],
  tasting: "", rating: null, visibility: "private",
};

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function formatDate(value: string) { return new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }); }
function ratio(recipe: Pick<Draft, "dose" | "water">) { return `1:${(recipe.water / recipe.dose).toFixed(1)}`; }
function initials(name: string) { return name.slice(0, 1).toUpperCase(); }
function recipeImageUrl(recipe: Pick<Recipe, "id" | "imageKey">) { return `/api/recipes/${encodeURIComponent(recipe.id)}/image?v=${encodeURIComponent(recipe.imageKey || "")}`; }

export default function CoffeeApp({ user }: { user: { id: string; name: string } | null }) {
  const [scope, setScope] = useState<Scope>("feed");
  const [items, setItems] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("すべて");
  const [sortBy, setSortBy] = useState<"date" | "likes" | "saves" | "comments">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState({ roast: "", country: "", dripper: "" });
  const [pendingAdvanced, setPendingAdvanced] = useState(advanced);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [detail, setDetail] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [memoTarget, setMemoTarget] = useState<Recipe | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [beanOptions, setBeanOptions] = useState<BeanOption[]>([]);
  const [grinderOptions, setGrinderOptions] = useState<GrinderOption[]>([]);
  const [dripperOptions, setDripperOptions] = useState<DripperOption[]>([]);
  const [searchOptions, setSearchOptions] = useState<{ countries: string[]; drippers: string[] }>({ countries: [], drippers: [] });
  const [addingGrinder, setAddingGrinder] = useState(false);
  const [newGrinderName, setNewGrinderName] = useState("");
  const [newGrinderMax, setNewGrinderMax] = useState(60);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingImageKey, setEditingImageKey] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const loadCatalogs = useCallback(async () => {
    if (!user) return;
    const [beanResult, grinderResult, dripperResult] = await Promise.all([fetch("/api/beans"), fetch("/api/grinders"), fetch("/api/drippers")]);
    if (beanResult.ok) setBeanOptions(((await beanResult.json()) as { beans: BeanOption[] }).beans);
    if (grinderResult.ok) setGrinderOptions(((await grinderResult.json()) as { grinders: GrinderOption[] }).grinders);
    if (dripperResult.ok) setDripperOptions(((await dripperResult.json()) as { drippers: DripperOption[] }).drippers);
  }, [user]);

  const load = useCallback(async (nextScope: Scope = scope) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope: nextScope, sort: sortBy, direction: sortDirection });
      for (const [key, value] of Object.entries(advanced)) if (value) params.set(key, value);
      const response = await fetch(`/api/recipes?${params}`);
      const data = await response.json() as { recipes: Recipe[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setItems(data.recipes);
    } catch (error) { setNotice(error instanceof Error ? error.message : "読み込めませんでした"); }
    finally { setLoading(false); }
  }, [scope, advanced, sortBy, sortDirection]);

  useEffect(() => { void load(scope); }, [scope, load]);
  useEffect(() => { void loadCatalogs(); }, [loadCatalogs]);
  useEffect(() => { void fetch("/api/search-options").then(async (response) => { if (response.ok) setSearchOptions(await response.json() as { countries: string[]; drippers: string[] }); }); }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") { startNew(); return; }
    const id = params.get("recipe");
    if (id) void openDetail(id);
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { if (!memoTarget) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMemoTarget(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [memoTarget]);
  useEffect(() => { if (!imageFile) { setImagePreview(null); return; } const url = URL.createObjectURL(imageFile); setImagePreview(url); return () => URL.revokeObjectURL(url); }, [imageFile]);

  const visible = useMemo(() => items.filter((item) => {
    const text = `${item.title} ${item.bean} ${item.authorName}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (methodFilter === "すべて" || item.method === methodFilter);
  }), [items, search, methodFilter]);
  const clickMax = grinderOptions.find((item) => item.name === draft.grinder)?.maxClicks ?? 60;
  const clickNumber = Math.min(clickMax, Math.max(0, Number.parseInt(draft.grindClicks, 10) || 0));

  function startNew() { if (!user) { location.href = "/login?return_to=%2F%3Fnew%3D1"; return; } setEditingId(null); setEditingImageKey(null); setImageFile(null); setRemoveImage(false); setDraft({ ...emptyDraft, steps: emptyDraft.steps.map((step) => ({ ...step })) }); setEditorOpen(true); }
  function closeEditor() { setEditorOpen(false); if (new URLSearchParams(location.search).get("new") === "1") history.replaceState(null, "", "/"); }
  function edit(item: Recipe) { setEditingId(item.id); setEditingImageKey(item.imageKey); setImageFile(null); setRemoveImage(false); setDraft({ title: item.title, method: item.method, serving: item.serving, bean: item.bean, beanId: item.beanId, dripper: item.dripper, dripperId: item.dripperId, roast: item.roast, grinder: item.grinder, grind: item.grind, grindClicks: item.grindClicks, dose: item.dose, water: item.water, temperature: item.temperature, targetTime: item.targetTime, actualTime: item.actualTime, actualBrew: item.actualBrew, hypothesis: item.hypothesis, steps: item.steps, tasting: item.tasting, rating: item.rating, visibility: item.visibility }); setDetail(null); setEditorOpen(true); }
  function change<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })); }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/recipes/${editingId}` : "/api/recipes", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(data.error);
      if (data.id) setEditingId(data.id);
      if (data.id && imageFile) {
        const upload = await fetch(`/api/recipes/${encodeURIComponent(data.id)}/image`, { method: "PUT", headers: { "Content-Type": "image/png" }, body: imageFile });
        if (!upload.ok) { const result = await upload.json() as { error?: string }; throw new Error(`レシピは保存しましたが、画像を設定できませんでした：${result.error || "再度お試しください"}`); }
      } else if (data.id && removeImage && editingImageKey) {
        const removal = await fetch(`/api/recipes/${encodeURIComponent(data.id)}/image`, { method: "DELETE" });
        if (!removal.ok) throw new Error("レシピは保存しましたが、画像を削除できませんでした");
      }
      closeEditor(); setNotice(draft.visibility === "public" ? "レシピを公開しました" : "レシピを保存しました");
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
  function openMemo(item: Recipe) {
    if (!user) { location.href = "/login?return_to=/"; return; }
    setMemoTarget(item); setMemoDraft(item.saveNote ?? "");
  }
  function updateBookmark(id: string, saved: boolean, note: string | null) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, saved, saveNote: note } : item));
    setDetail((current) => current?.id === id ? { ...current, saved, saveNote: note } : current);
  }
  async function saveMemo() {
    if (!memoTarget || memoSaving) return;
    setMemoSaving(true);
    try {
      const response = await fetch(`/api/recipes/${encodeURIComponent(memoTarget.id)}/bookmark`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: memoDraft }) });
      const data = await response.json() as { note?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "保存できませんでした");
      updateBookmark(memoTarget.id, true, data.note ?? "");
      if (sortBy === "saves") void load(scope);
      setMemoTarget(null); setNotice("自分用メモを保存しました");
    } catch (error) { setNotice(error instanceof Error ? error.message : "保存できませんでした"); }
    finally { setMemoSaving(false); }
  }
  async function removeBookmark() {
    if (!memoTarget || memoSaving) return;
    setMemoSaving(true);
    try {
      const response = await fetch(`/api/recipes/${encodeURIComponent(memoTarget.id)}/bookmark`, { method: "DELETE" });
      if (!response.ok) throw new Error("保存を解除できませんでした");
      updateBookmark(memoTarget.id, false, null);
      if (sortBy === "saves") void load(scope);
      if (scope === "saved") setItems((current) => current.filter((item) => item.id !== memoTarget.id));
      setMemoTarget(null); setNotice("保存を解除しました");
    } catch (error) { setNotice(error instanceof Error ? error.message : "保存を解除できませんでした"); }
    finally { setMemoSaving(false); }
  }
  async function interact(item: Recipe, type: "like" | "bookmark") {
    if (!user) { location.href = "/login?return_to=/"; return; }
    const response = await fetch(`/api/recipes/${item.id}/interact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
    if (!response.ok) { setNotice("操作できませんでした"); return; }
    const { active } = await response.json() as { active: boolean };
    setItems((current) => current.map((recipe) => recipe.id === item.id ? { ...recipe, [type === "like" ? "liked" : "saved"]: active, likeCount: type === "like" ? recipe.likeCount + (active ? 1 : -1) : recipe.likeCount } : recipe));
    setDetail((current) => current?.id === item.id ? { ...current, [type === "like" ? "liked" : "saved"]: active, likeCount: type === "like" ? current.likeCount + (active ? 1 : -1) : current.likeCount } : current);
    if (type === "like" && sortBy === "likes") void load(scope);
  }
  async function postComment() {
    if (!detail || !commentText.trim()) return;
    if (!user) { location.href = "/login?return_to=/"; return; }
    const response = await fetch(`/api/recipes/${detail.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: commentText }) });
    const data = await response.json() as { comment: Comment; error?: string };
    if (!response.ok) { setNotice(data.error || "コメントできませんでした"); return; }
    setComments((current) => [...current, data.comment]); setCommentText("");
    setItems((current) => current.map((item) => item.id === detail.id ? { ...item, commentCount: item.commentCount + 1 } : item));
    if (sortBy === "comments") void load(scope);
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

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (file.type !== "image/png" || file.size > 5 * 1024 * 1024) { setNotice("5MB以下のPNG画像を選んでください"); return; }
    setImageFile(file); setRemoveImage(false);
  }

  const scopeTitle: Record<Scope, string> = { feed: "みんなのレシピ", following: "フォロー中", mine: "マイレシピ", saved: "保存したレシピ" };
  const scopeDescription: Record<Scope, string> = { feed: "誰かのこだわりから、新しい淹れ方を見つけよう。", following: "フォローした作成者の公開レシピをまとめて。", mine: "試行錯誤の記録を、ここに。", saved: "また試したいレシピを、いつでも。" };
  const emptyTitle = search || methodFilter !== "すべて" ? "条件に合うレシピはまだありません" : { feed: "最初のレシピを待っています", following: "フォロー中のレシピはまだありません", mine: "最初の一杯を記録しましょう", saved: "保存したレシピはまだありません" }[scope];
  const emptyDescription = { feed: "淹れ方のひらめきや、実際に飲んだ感想を共有してみましょう。", following: "気になる作成者をフォローすると、その人の公開レシピがここに並びます。", mine: "抽出前の狙いと抽出後の感想を分けて残せます。", saved: "気になるレシピのブックマークを押すと、ここに並びます。" }[scope];

  return <div className="site-shell">
    <header className="site-header"><div className="header-inner">
      <button className="brand" onClick={() => setScope("feed")} aria-label="CoffeeMate ホーム"><span className="brand-mark"><Coffee size={22} strokeWidth={2.1} /></span><span>Coffee<span className="brand-accent">Mate</span></span></button>
      <nav className="top-nav" aria-label="メインメニュー"><button className={scope === "feed" ? "active" : ""} onClick={() => setScope("feed")}>みんなのレシピ</button><button className={scope === "following" ? "active" : ""} onClick={() => user ? setScope("following") : location.href = "/login?return_to=/"}>フォロー中</button><button className={scope === "mine" ? "active" : ""} onClick={() => user ? setScope("mine") : location.href = "/login?return_to=/"}>マイレシピ</button><button className={scope === "saved" ? "active" : ""} onClick={() => user ? setScope("saved") : location.href = "/login?return_to=/"}>保存したレシピ</button><a href="/beans">コーヒー豆</a><a href="/about">サイトについて</a>{user && <a href={`/users/${encodeURIComponent(user.id)}`}>マイページ</a>}</nav>
      <div className="header-actions">{user ? <><a className="user-chip" href={`/users/${encodeURIComponent(user.id)}`} aria-label="マイページを開く"><span className="avatar small">{initials(user.name)}</span><span className="user-name">{user.name}</span></a><a className="logout-link" href="/logout" target="_top"><LogOut size={15} /> ログアウト</a></> : <a className="login-link" href="/login?return_to=/" target="_top">ログイン</a>}<button className="primary-button header-create" onClick={startNew}><Plus size={17} /> レシピを作成</button></div>
    </div></header>

    <main className="main-wrap">
      <section className="hero"><div className="hero-content"><span className="eyebrow"><span className="eyebrow-dot" /> BREW NOTEBOOK & COMMUNITY</span><h1>一杯を、<br /><em>もっと自分らしく。</em></h1><p>ひらめきをレシピに。淹れたあとの気づきを、次の一杯へ。<br className="desktop-break" />あなたのコーヒーの記録が、誰かの「おいしい」につながる。</p><div className="hero-actions"><button className="primary-button hero-button" onClick={startNew}>最初のレシピを記録する <span>↗</span></button><span>設計から感想まで、ひとつの場所に。</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="coffee-cup"><div className="coffee-surface" /><div className="latte-swirl swirl-one" /><div className="latte-swirl swirl-two" /><div className="cup-shine" /></div><div className="cup-handle" /></div></section>

      <div className="content-grid"><aside className="sidebar"><p className="side-label">EXPLORE</p><button className={`side-link ${scope === "feed" ? "selected" : ""}`} onClick={() => setScope("feed")}><Coffee size={18} /> みんなのレシピ</button><button className={`side-link ${scope === "following" ? "selected" : ""}`} onClick={() => user ? setScope("following") : location.href = "/login?return_to=/"}><Users size={18} /> フォロー中</button><button className={`side-link ${scope === "mine" ? "selected" : ""}`} onClick={() => user ? setScope("mine") : location.href = "/login?return_to=/"}><SlidersHorizontal size={18} /> マイレシピ</button><button className={`side-link ${scope === "saved" ? "selected" : ""}`} onClick={() => user ? setScope("saved") : location.href = "/login?return_to=/"}><Bookmark size={18} /> 保存したレシピ</button><a className="side-link" href="/beans"><Coffee size={18} /> コーヒー豆</a><a className="side-link" href="/about">サイトについて</a>{user && <a className="side-link" href={`/users/${encodeURIComponent(user.id)}`}><UserRound size={18} /> マイページ</a>}</aside>

      <section className="feed"><div className="section-heading"><div><span className="section-kicker">DISCOVER YOUR NEXT CUP</span><h2>{scopeTitle[scope]}</h2><p>{scopeDescription[scope]}</p></div><button className="outline-button new-inline" onClick={startNew}><Plus size={16} /> 新しいレシピ</button></div>
        <div className="feed-tools"><div className="search-main"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="豆・レシピ・ユーザーを検索" /></label><button type="button" className={`advanced-search-button${Object.values(advanced).some(Boolean) ? " active" : ""}`} onClick={() => { setPendingAdvanced(advanced); setAdvancedOpen(true); }}><SlidersHorizontal size={16} /> 詳細な検索</button></div><div className="feed-refine"><div className="filter-scroll">{["すべて", ...methods].map((method) => <button key={method} className={`filter-pill ${methodFilter === method ? "selected" : ""}`} onClick={() => setMethodFilter(method)}>{method}</button>)}</div><div className="sort-controls"><label>並び替え<select aria-label="レシピの並び替え" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="date">日付順</option><option value="likes">いいね順</option><option value="saves">保存数順</option><option value="comments">コメント順</option></select></label><button type="button" aria-label={sortDirection === "desc" ? "昇順に切り替え" : "降順に切り替え"} title={sortDirection === "desc" ? "降順・多い順" : "昇順・少ない順"} onClick={() => setSortDirection((current) => current === "desc" ? "asc" : "desc")}>{sortDirection === "desc" ? "降順 ↓" : "昇順 ↑"}</button></div></div></div>
        {loading ? <div className="loading-grid"><div /><div /><div /></div> : visible.length ? <div className="recipe-grid">{visible.map((item, index) => <article className="recipe-card" key={item.id}><button className={`recipe-art art-${index % 4}${item.imageKey ? " with-image" : ""}`} onClick={() => void openDetail(item.id)} aria-label={`${item.title}を開く`}>{item.imageKey && <img className="recipe-art-image" src={recipeImageUrl(item)} alt="" loading="lazy" />}<RecipeBadges method={item.method} country={item.beanCountry} roast={item.roast} serving={item.serving} dripper={item.dripper} /><span className="recipe-art-bean">{(item.bean || "豆未設定").slice(0, 14)}</span><span className="art-coffee-dot" /></button><div className="recipe-body"><div className="recipe-meta"><span className="avatar">{initials(item.authorName)}</span><a className="author-name" href={`/users/${encodeURIComponent(item.userId)}`}>{item.authorName}</a><span className="meta-dot">·</span><time>{formatDate(item.createdAt)}</time>{item.visibility === "private" && <span className="private-tag">非公開</span>}</div><button className="recipe-title" onClick={() => void openDetail(item.id)}>{item.title}</button><p className="recipe-bean">{item.bean || "豆未設定"} <span>·</span> {item.roast}</p><div className="recipe-stats"><span><Coffee size={15} /> {item.dose}g</span><span><Droplets size={15} /> {item.water}ml</span><span><Thermometer size={15} /> {item.temperature}℃</span><span><Clock3 size={15} /> {formatTime(item.targetTime)}</span></div>{item.hypothesis && <p className="recipe-excerpt">{item.hypothesis}</p>}{scope === "saved" && item.saveNote && <p className="saved-note-preview"><Bookmark size={13} /> <span>{item.saveNote}</span></p>}<div className="card-footer"><button className={item.liked ? "engaged" : ""} onClick={() => void interact(item, "like")} aria-label="いいね"><Heart size={17} fill={item.liked ? "currentColor" : "none"} /> {item.likeCount}</button><button onClick={() => void openDetail(item.id)} aria-label="コメント"><MessageCircle size={17} /> {item.commentCount}</button><button className={item.saved ? "engaged" : ""} onClick={() => openMemo(item)} aria-label={item.saved ? "保存メモを編集" : "保存してメモ"}><Bookmark size={17} fill={item.saved ? "currentColor" : "none"} /></button><button onClick={() => void share(item)} aria-label="共有"><Share2 size={17} /></button></div></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Coffee size={31} /></div><h3>{emptyTitle}</h3><p>{emptyDescription}</p>{scope === "following" ? <button className="primary-button" onClick={() => setScope("feed")}>みんなのレシピを見る</button> : scope !== "saved" && <button className="primary-button" onClick={startNew}><Plus size={17} /> レシピを作成</button>}</div>}
      </section></div>
    </main>

    {advancedOpen && <div className="search-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAdvancedOpen(false); }}><div className="search-modal" role="dialog" aria-modal="true" aria-label="詳細な検索"><div className="search-modal-head"><h2>詳細な検索</h2><button type="button" onClick={() => setAdvancedOpen(false)} aria-label="閉じる"><X size={20} /></button></div><label>焙煎度<select value={pendingAdvanced.roast} onChange={(event) => setPendingAdvanced((current) => ({ ...current, roast: event.target.value }))}><option value="">すべて</option>{["浅煎り", "中浅煎り", "中煎り", "中深煎り", "深煎り"].map((value) => <option key={value}>{value}</option>)}</select></label><label>コーヒー豆の原産国<select value={pendingAdvanced.country} onChange={(event) => setPendingAdvanced((current) => ({ ...current, country: event.target.value }))}><option value="">すべて</option>{[...new Set(["エチオピア", "ケニア", "コロンビア", "ブラジル", "グアテマラ", "ルワンダ", "インドネシア", "タンザニア", "ホンジュラス", "コスタリカ", "パナマ", "エルサルバドル", "ペルー", "メキシコ", "中国", "イエメン", "ウガンダ", "ニカラグア", ...searchOptions.countries, ...beanOptions.map((bean) => bean.country).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "ja")).map((value) => <option key={value}>{value}</option>)}</select></label><label>ドリッパー<select value={pendingAdvanced.dripper} onChange={(event) => setPendingAdvanced((current) => ({ ...current, dripper: event.target.value }))}><option value="">すべて</option>{[...new Set([...searchOptions.drippers, ...items.map((item) => item.dripper).filter(Boolean), ...dripperOptions.map((item) => item.name), ...DRIPPER_CATALOG])].sort((a, b) => a.localeCompare(b, "ja")).map((value) => <option key={value}>{value}</option>)}</select></label><div className="search-modal-actions"><button type="button" onClick={() => setPendingAdvanced({ roast: "", country: "", dripper: "" })}>条件をクリア</button><button type="button" className="primary-button" onClick={() => { setAdvanced(pendingAdvanced); setAdvancedOpen(false); }}>この条件で検索</button></div></div></div>}
    {editorOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}><div className="editor-panel" role="dialog" aria-modal="true" aria-label="レシピを編集"><div className="panel-header"><div><span className="panel-kicker">BREW JOURNAL</span><h2>{editingId ? "レシピを編集" : "新しいレシピ"}</h2></div><button className="icon-button" onClick={() => closeEditor()} aria-label="閉じる"><X size={21} /></button></div><div className="editor-scroll">
      <div className="editor-intro"><span className="intro-icon"><Sparkles size={21} /></span><div><strong>今日はどんな一杯を淹れたい？</strong><p>まずは狙う味と抽出の条件を決めましょう。</p></div></div>
      <div className="field-group">
        <label>レシピの名前 <span className="optional-tag">任意・空欄なら日付＋連番</span><input value={draft.title} onChange={(event) => change("title", event.target.value)} placeholder="例：朝のやさしいエチオピア" maxLength={100} /></label>
        <div className="bean-field"><label htmlFor="bean-name">コーヒー豆 <span className="optional-tag">任意</span></label><input id="bean-name" value={draft.bean} onChange={(event) => setDraft((current) => ({ ...current, bean: event.target.value, beanId: null }))} placeholder="例：エチオピア イルガチェフェ" maxLength={100} />
          {!draft.beanId && draft.bean.trim() && <div className="bean-suggestions">{beanOptions.filter((bean) => bean.name.toLocaleLowerCase().includes(draft.bean.toLocaleLowerCase())).slice(0, 5).map((bean) => <button key={bean.id} onClick={() => setDraft((current) => ({ ...current, bean: bean.name, beanId: bean.id, roast: bean.roast || current.roast }))}><Coffee size={15} /><span>{bean.name}<small>{[bean.country, bean.region].filter(Boolean).join(" · ")}</small></span><Check size={14} /></button>)}</div>}
          {draft.beanId ? <a className="bean-help-link" href={`/beans/${draft.beanId}`} target="_blank" rel="noopener noreferrer">豆ページを開く ↗</a> : <small className="bean-help">{draft.bean.trim() ? "保存すると、この豆のページを自動で作成します。" : "豆が決まっていなくても保存できます。"}</small>}
        </div>
        <div className="recipe-image-field"><div className="recipe-image-copy"><strong>レシピ画像 <small>任意・PNG 5MBまで</small></strong><p>未設定ならこれまでのサムネイルを表示します。</p></div><div className="recipe-image-controls">{imagePreview || (editingId && editingImageKey && !removeImage) ? <img src={imagePreview || `/api/recipes/${encodeURIComponent(editingId!)}/image?v=${encodeURIComponent(editingImageKey!)}`} alt="選択中のレシピ画像" /> : <span className="recipe-image-placeholder"><Coffee size={25} /></span>}<label className="outline-button"><ImagePlus size={16} /> 画像を選ぶ<input type="file" accept="image/png,.png" onChange={(event) => { selectImage(event.target.files?.[0]); event.target.value = ""; }} /></label>{(imageFile || (editingImageKey && !removeImage)) && <button type="button" className="recipe-image-remove" onClick={() => { setImageFile(null); setRemoveImage(true); }}>画像を外す</button>}</div></div>
      </div>
      <div className="dripper-field"><strong>使用するドリッパー <small>任意</small></strong><DripperPicker options={dripperOptions} selectedId={draft.dripperId} onSelect={(item) => setDraft((current) => ({ ...current, dripper: item.name, dripperId: item.id || null }))} onAdded={(item) => setDripperOptions((current) => current.some((saved) => saved.id === item.id) ? current : [...current, item])} onError={setNotice} /></div>
      <div className="field-row"><label>抽出方法 <span className="select-wrap"><select value={draft.method} onChange={(event) => change("method", event.target.value)}>{methods.map((method) => <option key={method}>{method}</option>)}</select><ChevronDown size={16} /></span></label><label>焙煎度 <span className="select-wrap"><select value={draft.roast} onChange={(event) => change("roast", event.target.value)}>{["浅煎り", "中浅煎り", "中煎り", "中深煎り", "深煎り"].map((roast) => <option key={roast}>{roast}</option>)}</select><ChevronDown size={16} /></span></label></div>
      <div className="serving-picker"><span>ホット／アイス</span><div role="group" aria-label="ホットまたはアイスを選択">{(["hot", "iced"] as const).map((serving) => <button type="button" key={serving} className={draft.serving === serving ? "selected" : ""} aria-pressed={draft.serving === serving} onClick={() => change("serving", serving)}>{serving === "hot" ? "ホット" : "アイス"}</button>)}</div></div>
      <div className="editor-section-title"><span>01</span><div><h3>挽き目を決める</h3><p>ミルを選んでから、クリック数と粒度を調整</p></div></div>
      <div className="field-row"><label>使用するミル <span className="select-wrap"><select value={draft.grinder} onChange={(event) => change("grinder", event.target.value)}><option value="">未選択</option>{grinders.filter((name) => name !== "未選択" && name !== "その他").map((name) => <option key={name} value={name}>{name}</option>)}{grinderOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}{draft.grinder && !grinders.includes(draft.grinder) && !grinderOptions.some((item) => item.name === draft.grinder) && <option value={draft.grinder}>{draft.grinder}</option>}</select><ChevronDown size={16} /></span></label><div className="click-field"><span>クリック数</span><div className="click-stepper"><button onClick={() => change("grindClicks", String(Math.max(0, clickNumber - 1)))} aria-label="クリック数を減らす"><Minus size={16} /></button><input type="number" min="0" max={clickMax} value={draft.grindClicks} onChange={(event) => change("grindClicks", event.target.value)} placeholder="0" aria-label="クリック数" /><small>clicks</small><button onClick={() => change("grindClicks", String(Math.min(clickMax, clickNumber + 1)))} aria-label="クリック数を増やす"><Plus size={16} /></button></div></div></div>
      <div className="click-range"><span>細かい</span><input type="range" min="0" max={clickMax} value={clickNumber} onChange={(event) => change("grindClicks", event.target.value)} aria-label="クリック数をスライダーで調整" /><span>粗い</span></div><div className="click-quick">{[12, 18, 24, 30].filter((value) => value <= clickMax).map((value) => <button key={value} onClick={() => change("grindClicks", String(value))}>{value} clicks</button>)}<button className="add-grinder-link" onClick={() => setAddingGrinder(!addingGrinder)}><Plus size={14} /> ミルを追加</button></div>
      {addingGrinder && <div className="add-grinder-form"><label>ミル名<input value={newGrinderName} onChange={(event) => setNewGrinderName(event.target.value)} placeholder="例：1Zpresso X-Ultra" maxLength={80} /></label><label>クリック数の上限<input type="number" min="10" max="300" value={newGrinderMax} onChange={(event) => setNewGrinderMax(Number(event.target.value))} /></label><button onClick={() => void addGrinder()}>追加して選択</button></div>}
      <div className="grind-picker" role="group" aria-label="挽き目">{grinds.map((grind) => <button key={grind} className={draft.grind === grind ? "selected" : ""} onClick={() => change("grind", grind)}>{grind}</button>)}</div>
      <div className="editor-section-title"><span>02</span><div><h3>抽出条件を整える</h3><p>数字を直接入力するか、つまみで調整</p></div></div><div className="adjust-grid"><Adjust label="豆の量" unit="g" value={draft.dose} min={5} max={60} step={0.1} icon={<Coffee size={19} />} onChange={(value) => change("dose", value)} /><Adjust label="お湯の量" unit="ml" value={draft.water} min={50} max={1000} step={1} icon={<Droplets size={19} />} onChange={(value) => change("water", value)} /><Adjust label="湯温" unit="℃" value={draft.temperature} min={40} max={100} step={0.5} icon={<Thermometer size={19} />} onChange={(value) => change("temperature", value)} /></div><div className="ratio-strip"><span>抽出比率</span><strong>{ratio(draft)}</strong><small>豆 {draft.dose}g : お湯 {draft.water}ml</small></div>
      <div className="editor-section-title"><span>03</span><div><h3>注ぎ方と狙い</h3><p>抽出の流れと、味の仮説を記録</p></div></div><TimePicker label="目標抽出時間" value={draft.targetTime} onChange={(seconds) => change("targetTime", seconds ?? 0)} /><div className="steps-heading"><span>注湯ステップ</span><button onClick={() => change("steps", [...draft.steps, { time: 0, water: draft.water, note: "" }])}><Plus size={15} /> ステップ追加</button></div><div className="steps-list">{draft.steps.map((step, index) => <div className="step-row" key={index}><span className="step-index">{String(index + 1).padStart(2, "0")}</span><TimePicker compact label={`${index + 1}投目の時刻`} value={step.time} onChange={(seconds) => change("steps", draft.steps.map((item, i) => i === index ? { ...item, time: seconds ?? 0 } : item))} /><label><input type="number" min="0" value={step.water} onChange={(event) => change("steps", draft.steps.map((item, i) => i === index ? { ...item, water: Number(event.target.value) } : item))} /> mlまで</label><input className="step-note" value={step.note} onChange={(event) => change("steps", draft.steps.map((item, i) => i === index ? { ...item, note: event.target.value } : item))} placeholder="蒸らし・1投目など" /><button className="step-delete" onClick={() => change("steps", draft.steps.filter((_, i) => i !== index))} aria-label="ステップを削除"><X size={15} /></button></div>)}</div><label className="single-field">抽出前の仮説・狙う味<textarea value={draft.hypothesis} onChange={(event) => change("hypothesis", event.target.value)} placeholder="例：湯温を少し下げて、酸味をやわらかく出したい。" rows={4} /></label>
      <div className="editor-section-title"><span>04</span><div><h3>味の感想</h3><p>淹れたあとに、味わいや次に試したいことを自由に記録</p></div></div><label className="single-field">味わい・気づいたこと<textarea value={draft.tasting} onChange={(event) => change("tasting", event.target.value)} placeholder="例：柑橘のような明るい酸味。後味は軽く、少し薄く感じたので次回は挽き目を細かくしたい。" rows={6} /></label>
    </div><div className="editor-footer"><label className="visibility-toggle"><input type="checkbox" checked={draft.visibility === "public"} onChange={(event) => change("visibility", event.target.checked ? "public" : "private")} /><span className="toggle-track" /><span><strong>{draft.visibility === "public" ? "一般公開" : "非公開で保存"}</strong><small>{draft.visibility === "public" ? "サイト全体の公開後に閲覧・共有できます" : "自分だけが閲覧できます"}</small></span></label><button className="primary-button" onClick={() => void save()} disabled={saving}>{saving ? "保存中..." : editingId ? "変更を保存" : draft.visibility === "public" ? "公開する" : "保存する"} <span>↗</span></button></div></div></div>}

    {detail && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}><div className="detail-panel" role="dialog" aria-modal="true" aria-label={detail.title}><button className="detail-close icon-button" onClick={closeDetail} aria-label="閉じる"><X size={20} /></button><div className={`detail-hero${detail.imageKey ? " with-image" : ""}`}>{detail.imageKey && <img className="detail-hero-image" src={recipeImageUrl(detail)} alt={detail.title} />}<span>{detail.method}</span><div className="detail-cup" /><p>BREW RECIPE / COFFEEMATE</p></div><div className="detail-body"><div className="detail-author"><span className="avatar">{initials(detail.authorName)}</span><a className="detail-author-link" href={`/users/${encodeURIComponent(detail.userId)}`}>{detail.authorName}</a><span>·</span><time>{formatDate(detail.createdAt)}</time>{detail.visibility === "private" && <span className="private-tag">非公開</span>}{detail.moderationStatus === "hidden" && <span className="private-tag">運営により非表示</span>}</div><h2>{detail.title}</h2><p className="detail-bean">{detail.beanId && detail.userId === user?.id ? <a href={"/beans/" + detail.beanId}>{detail.bean || "豆未設定"} ↗</a> : detail.bean || "豆未設定"} · {detail.roast}</p><div className="detail-stat-grid"><div><Coffee size={18} /><small>豆</small><strong>{detail.dose}g</strong></div><div><Droplets size={18} /><small>お湯</small><strong>{detail.water}ml</strong></div><div><Thermometer size={18} /><small>湯温</small><strong>{detail.temperature}℃</strong></div><div><Clock3 size={18} /><small>目標時間</small><strong>{formatTime(detail.targetTime)}</strong></div></div><div className="detail-section"><h3>抽出の狙い</h3><p>{detail.hypothesis || "仮説はまだ記録されていません。"}</p><div className="detail-facts"><span>ホット／アイス <strong>{detail.serving === "iced" ? "アイス" : detail.serving === "hot" ? "ホット" : "未設定"}</strong></span><span>ドリッパー <strong>{detail.dripper || "未設定"}</strong></span><span>ミル <strong>{detail.grinder || "未設定"}</strong></span><span>挽き目 <strong>{detail.grind}{detail.grindClicks && ` / ${detail.grindClicks}`}</strong></span><span>抽出比率 <strong>{ratio(detail)}</strong></span></div>{detail.steps.length > 0 && <div className="detail-steps">{detail.steps.map((step, index) => <div key={index}><span>{formatTime(step.time)}</span><strong>{step.water}ml</strong><p>{step.note}</p></div>)}</div>}</div><div className="detail-section tasting-section"><h3>味の感想</h3><p>{detail.tasting || "感想はまだ記録されていません。"}</p>{(detail.actualBrew || detail.actualTime !== null) && <details className="legacy-record"><summary>以前の抽出記録を表示</summary>{detail.actualBrew && <ActualBrewDetail brew={detail.actualBrew} />}{detail.actualTime !== null && <small>実際の抽出時間：{formatTime(detail.actualTime)}</small>}</details>}</div><div className="detail-actions"><button onClick={() => void interact(detail, "like")} className={detail.liked ? "engaged" : ""}><Heart size={18} fill={detail.liked ? "currentColor" : "none"} /> いいね</button><button onClick={() => openMemo(detail)} className={detail.saved ? "engaged" : ""}><Bookmark size={18} fill={detail.saved ? "currentColor" : "none"} /> 保存</button><button onClick={() => void share(detail)}><Share2 size={18} /> 共有</button><ReportButton targetType="recipe" targetId={detail.id} loggedIn={!!user} /></div>{detail.saved && user && <div className="private-save-note"><div><Bookmark size={17} /><strong>自分用メモ</strong><span>自分だけに表示</span></div><p>{detail.saveNote || "メモはまだありません。"}</p><button type="button" onClick={() => openMemo(detail)}>メモを編集</button></div>}<div className="share-row"><button onClick={() => void share(detail, "x")}>Xで共有 ↗</button><button onClick={() => void share(detail, "instagram")}>Instagram用にリンクをコピー ↗</button></div>{detail.userId === user?.id && <div className="owner-actions"><button onClick={() => edit(detail)}>レシピを編集</button><button onClick={() => void remove(detail)}><Trash2 size={15} /> 削除</button></div>}<div className="comments-section"><h3>コメント <span>{comments.length}</span></h3>{comments.map((comment) => <div className="comment" key={comment.id}><span className="avatar small">{initials(comment.authorName)}</span><div><a className="comment-author-link" href={`/users/${encodeURIComponent(comment.userId)}`}>{comment.authorName}</a><time>{formatDate(comment.createdAt)}</time><p>{comment.body}</p><ReportButton targetType="comment" targetId={comment.id} loggedIn={!!user} compact /></div></div>)}<div className="comment-form"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="このレシピへの感想や質問をどうぞ" rows={3} /><button className="primary-button" onClick={() => void postComment()} disabled={!commentText.trim()}>コメントする</button></div></div></div></div></div>}
    {memoTarget && <div className="memo-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setMemoTarget(null); }}><div className="memo-dialog" role="dialog" aria-modal="true" aria-label="自分用メモ"><div className="memo-head"><div><span>保存したレシピ</span><h2>自分用メモ</h2></div><button type="button" onClick={() => setMemoTarget(null)} aria-label="閉じる"><X size={20} /></button></div><p className="memo-recipe-title">{memoTarget.title}</p><label htmlFor="private-bookmark-note">このレシピについて自分だけのメモを残せます</label><textarea id="private-bookmark-note" autoFocus value={memoDraft} onChange={(event) => setMemoDraft(event.target.value)} maxLength={2000} rows={5} placeholder="例：次に試すときは湯温を1℃下げる" /><small>{memoDraft.length} / 2000文字 · 作成者や他の利用者には表示されません</small><div className="memo-actions">{memoTarget.saved && <button type="button" className="memo-remove" disabled={memoSaving} onClick={() => void removeBookmark()}>保存を解除</button>}<button type="button" className="primary-button" disabled={memoSaving} onClick={() => void saveMemo()}>{memoSaving ? "保存中..." : memoTarget.saved ? "メモを保存" : "レシピとメモを保存"}</button></div></div></div>}
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

function ActualBrewDetail({ brew }: { brew: BrewConditions }) {
  return <div className="actual-brew-detail"><div className="actual-facts"><span>方法 <strong>{brew.method}</strong></span><span>ミル <strong>{brew.grinder || "未設定"}</strong></span><span>挽き目 <strong>{brew.grind}{brew.grindClicks ? ` / ${brew.grindClicks} clicks` : ""}</strong></span></div><div className="actual-metrics"><span>豆 <strong>{brew.dose}g</strong></span><span>お湯 <strong>{brew.water}ml</strong></span><span>湯温 <strong>{brew.temperature}℃</strong></span></div>{brew.steps.length > 0 && <div className="detail-steps">{brew.steps.map((step, index) => <div key={index}><span>{formatTime(step.time)}</span><strong>{step.water}ml</strong><p>{step.note}</p></div>)}</div>}</div>;
}
