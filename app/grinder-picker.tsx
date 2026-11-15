"use client";

import { useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { GRINDER_CATALOG } from "../lib/grinder-catalog";

export type GrinderOption = { id: string; name: string; maxClicks: number };
type Props = { options: GrinderOption[]; selectedName?: string; onSelect?: (grinder: GrinderOption | null) => void; onAdded: (grinder: GrinderOption) => void; onError: (message: string) => void };

export default function GrinderPicker({ options, selectedName, onSelect, onAdded, onError }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [maxClicks, setMaxClicks] = useState(60);
  const [busy, setBusy] = useState(false);
  const filtered = GRINDER_CATALOG.filter((item) => item.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && !options.some((saved) => saved.name.toLocaleLowerCase() === item.toLocaleLowerCase()));
  const custom = query.trim() && !options.some((item) => item.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase()) && !GRINDER_CATALOG.some((item) => item.toLocaleLowerCase() === query.trim().toLocaleLowerCase());

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/grinders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), maxClicks }) });
      const data = await response.json() as { grinder?: GrinderOption; error?: string };
      if (!response.ok || !data.grinder) throw new Error(data.error || "追加できませんでした");
      onAdded(data.grinder);
      onSelect?.(data.grinder);
      setName(""); setQuery(""); setOpen(false);
    } catch (error) { onError(error instanceof Error ? error.message : "追加できませんでした"); }
    finally { setBusy(false); }
  }

  return <div className="grinder-picker">
    {onSelect && <div className="dripper-owned" role="group" aria-label="マイミルから選択"><button type="button" className={!selectedName ? "selected" : ""} onClick={() => onSelect(null)}>未選択</button>{options.map((item) => <button type="button" key={item.id} className={selectedName === item.name ? "selected" : ""} onClick={() => onSelect(item)}>{selectedName === item.name && <Check size={14} />}{item.name}</button>)}</div>}
    {!onSelect && options.length > 0 && <div className="dripper-owned">{options.map((item) => <span className="dripper-saved" key={item.id}>{item.name}</span>)}</div>}
    <button type="button" className="dripper-browse-button" onClick={() => setOpen(!open)}><Plus size={16} /> {open ? "一覧を閉じる" : "ミル一覧から追加"}</button>
    {open && <div className="dripper-catalog"><label className="dripper-search"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setName(""); }} placeholder="メーカー・モデルで探す／名前を入力" maxLength={80} /></label><div className="dripper-catalog-list">{filtered.map((item) => <button type="button" key={item} onClick={() => setName(item)}><Plus size={14} /> {item}</button>)}{custom && <button type="button" onClick={() => setName(query.trim())}><Plus size={14} /> 「{query.trim()}」を追加</button>}{!filtered.length && !custom && <p>一致するミルはありません。名前を入力して追加できます。</p>}</div>{name && <div className="grinder-add-form"><strong>{name}</strong><label>クリック数の上限 <input type="number" min="10" max="300" value={maxClicks} onChange={(event) => setMaxClicks(Number(event.target.value))} /></label><button type="button" disabled={busy || !Number.isInteger(maxClicks) || maxClicks < 10 || maxClicks > 300} onClick={() => void add()}>{busy ? "登録中..." : "マイミルに登録"}</button></div>}</div>}
  </div>;
}
