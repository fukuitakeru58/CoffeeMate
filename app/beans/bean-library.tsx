"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Coffee, MapPin, Plus, Save, Search, Trash2 } from "lucide-react";

type Bean = {
  id: string; name: string; country: string; region: string; farm: string; variety: string; process: string;
  terroir: string; purchasePlace: string; purchaseMapUrl: string; notes: string; updatedAt: string;
};
type LinkedRecipe = { id: string; title: string; method: string; createdAt: string };

function safeMapLink(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed = host === "maps.app.goo.gl" || host === "goo.gl" || host === "google.com" || host.endsWith(".google.com") || host === "openstreetmap.org" || host.endsWith(".openstreetmap.org");
    return url.protocol === "https:" && allowed ? url.toString() : "";
  } catch { return ""; }
}

export default function BeanLibrary({ initialId }: { initialId: string | null }) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [bean, setBean] = useState<Bean | null>(null);
  const [linkedRecipes, setLinkedRecipes] = useState<LinkedRecipe[]>([]);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    const response = await fetch("/api/beans");
    if (response.ok) setBeans(((await response.json()) as { beans: Bean[] }).beans);
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/beans/${id}`);
    const data = await response.json() as { bean?: Bean; recipes?: LinkedRecipe[]; error?: string };
    if (!response.ok || !data.bean) { setNotice(data.error || "豆ページを開けませんでした"); return; }
    setBean(data.bean); setLinkedRecipes(data.recipes || []);
  }, []);
  useEffect(() => { void loadList(); if (initialId) void loadDetail(initialId); }, [initialId, loadList, loadDetail]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(timer); }, [notice]);

  async function addBean() {
    if (!newName.trim()) { setNotice("豆の名前を入力してください"); return; }
    const response = await fetch("/api/beans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
    const data = await response.json() as { bean?: { id: string }; error?: string };
    if (!response.ok || !data.bean) { setNotice(data.error || "追加できませんでした"); return; }
    location.href = `/beans/${data.bean.id}`;
  }
  async function saveBean() {
    if (!bean) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/beans/${bean.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bean) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "保存できませんでした");
      setNotice("豆ページを保存しました"); await loadList();
    } catch (error) { setNotice(error instanceof Error ? error.message : "保存できませんでした"); }
    finally { setSaving(false); }
  }
  async function deleteBean() {
    if (!bean || !confirm("この豆ページを削除しますか？ レシピの豆名は残ります。")) return;
    const response = await fetch(`/api/beans/${bean.id}`, { method: "DELETE" });
    if (response.ok) location.href = "/beans";
    else setNotice("削除できませんでした");
  }
  function update<K extends keyof Bean>(key: K, value: Bean[K]) { setBean((current) => current ? { ...current, [key]: value } : current); }
  const visible = beans.filter((item) => `${item.name} ${item.country} ${item.region}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const mapSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bean?.purchasePlace || bean?.name || "コーヒー豆 店舗")}`;
  const mapLink = safeMapLink(bean?.purchaseMapUrl || "");

  return <div className="site-shell bean-page">
    <header className="site-header"><div className="header-inner"><a className="brand" href="/"><span className="brand-mark"><Coffee size={22} /></span><span>Coffee<span className="brand-accent">Mate</span></span></a><nav className="top-nav"><a href="/">レシピ</a><a className="active" href="/beans">コーヒー豆</a></nav><div className="header-actions"><a className="outline-button" href="/"><ArrowLeft size={15} /> レシピに戻る</a></div></div></header>
    <main className="bean-layout"><aside className="bean-sidebar"><div className="bean-sidebar-heading"><span>MY BEANS</span><h1>コーヒー豆</h1><p>豆ごとの産地や購入場所を記録。</p></div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="豆を検索" /></label><div className="bean-list">{visible.map((item) => <a key={item.id} className={item.id === initialId ? "selected" : ""} href={`/beans/${item.id}`}><span className="bean-list-icon"><Coffee size={17} /></span><span><strong>{item.name}</strong><small>{[item.country, item.region].filter(Boolean).join(" · ") || "産地未登録"}</small></span></a>)}</div><div className="bean-add"><label>新しい豆を追加<input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addBean(); }} placeholder="例：エチオピア イルガチェフェ" /></label><button onClick={() => void addBean()}><Plus size={16} /> 豆ページを作成</button></div></aside>
      <section className="bean-main">{bean ? <><div className="bean-main-head"><div><span className="section-kicker">COFFEE BEAN NOTEBOOK</span><h2>{bean.name}</h2><p>産地のことも、買ったお店のことも。この豆の記録をひとつに。</p></div><button className="primary-button" onClick={() => void saveBean()} disabled={saving}><Save size={16} /> {saving ? "保存中..." : "変更を保存"}</button></div>
        <div className="bean-sheet"><div className="bean-sheet-section"><span className="bean-section-number">01 / IDENTITY</span><h3>豆の基本情報</h3><div className="bean-fields"><label className="wide">豆の名前<input value={bean.name} onChange={(event) => update("name", event.target.value)} maxLength={100} /></label><label>生産国<input value={bean.country} onChange={(event) => update("country", event.target.value)} placeholder="例：エチオピア" /></label><label>地域<input value={bean.region} onChange={(event) => update("region", event.target.value)} placeholder="例：イルガチェフェ" /></label><label>農園・ウォッシングステーション<input value={bean.farm} onChange={(event) => update("farm", event.target.value)} placeholder="例：チェルベサ" /></label><label>品種<input value={bean.variety} onChange={(event) => update("variety", event.target.value)} placeholder="例：在来種" /></label><label>精製方法<input value={bean.process} onChange={(event) => update("process", event.target.value)} placeholder="例：ウォッシュト" /></label></div></div>
        <div className="bean-sheet-section"><span className="bean-section-number">02 / TERROIR</span><h3>テロワール・味の背景</h3><textarea value={bean.terroir} onChange={(event) => update("terroir", event.target.value)} rows={5} placeholder="標高、土壌、気候、収穫時期など、味に影響しそうなことを自由に。" /></div>
        <div className="bean-sheet-section"><span className="bean-section-number">03 / WHERE I FOUND IT</span><h3>購入場所</h3><p className="bean-helper">店名を入力して Google マップで探し、選んだ店舗の共有リンクを貼り付けて保存できます。</p><div className="bean-fields"><label>店舗名・購入先<input value={bean.purchasePlace} onChange={(event) => update("purchasePlace", event.target.value)} placeholder="例：珈琲店〇〇" /></label><label>Google マップの共有リンク<input value={bean.purchaseMapUrl} onChange={(event) => update("purchaseMapUrl", event.target.value)} placeholder="https://maps.app.goo.gl/..." /></label></div><div className="map-actions"><a href={mapSearch} target="_blank" rel="noopener noreferrer"><MapPin size={17} /> Google マップで探す <ArrowUpRight size={15} /></a>{mapLink && <a href={mapLink} target="_blank" rel="noopener noreferrer">保存した場所を開く ↗</a>}</div></div>
        <div className="bean-sheet-section"><span className="bean-section-number">04 / MEMO</span><h3>その他のメモ</h3><textarea value={bean.notes} onChange={(event) => update("notes", event.target.value)} rows={4} placeholder="購入日、焙煎日、価格、気づいたことなど。" /></div></div>
        <div className="bean-recipes"><h3>この豆を使ったレシピ <span>{linkedRecipes.length}</span></h3>{linkedRecipes.length ? linkedRecipes.map((recipe) => <a href={`/?recipe=${recipe.id}`} key={recipe.id}><Coffee size={17} /><span><strong>{recipe.title}</strong><small>{recipe.method} · {new Date(recipe.createdAt).toLocaleDateString("ja-JP")}</small></span><ArrowUpRight size={16} /></a>) : <p>この豆を使ったレシピはまだありません。</p>}</div><button className="bean-delete" onClick={() => void deleteBean()}><Trash2 size={15} /> この豆ページを削除</button></> : <div className="bean-welcome"><div><Coffee size={34} /></div><span className="section-kicker">YOUR BEAN LIBRARY</span><h2>豆から、記録をひもとく。</h2><p>レシピに豆の名前を入力すると、ここに豆ページが自動で作成されます。<br />左の一覧から豆を選ぶか、新しい豆を追加してください。</p></div>}</section></main>
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>;
}
