"use client";

import { useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { DRIPPER_CATALOG } from "../lib/dripper-catalog";

export type DripperOption = { id: string; name: string };
type Props = { options: DripperOption[]; selectedId?: string | null; onSelect?: (dripper: DripperOption) => void; onAdded: (dripper: DripperOption) => void; onError: (message: string) => void };

export default function DripperPicker({ options, selectedId, onSelect, onAdded, onError }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const filtered = DRIPPER_CATALOG.filter((name) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && !options.some((item) => item.name === name));
  const custom = query.trim() && !options.some((item) => item.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase()) && !DRIPPER_CATALOG.some((name) => name.toLocaleLowerCase() === query.trim().toLocaleLowerCase());

  async function add(name: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/drippers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json() as { dripper?: DripperOption; error?: string };
      if (!response.ok || !data.dripper) throw new Error(data.error || "追加できませんでした");
      onAdded(data.dripper);
      onSelect?.(data.dripper);
      setOpen(false); setQuery("");
    } catch (error) { onError(error instanceof Error ? error.message : "追加できませんでした"); }
    finally { setBusy(false); }
  }

  return <div className="dripper-picker">
    {onSelect && <div className="dripper-owned" role="group" aria-label="マイドリッパーから選択"><button type="button" className={!selectedId ? "selected" : ""} onClick={() => onSelect({ id: "", name: "" })}>未選択</button>{options.map((item) => <button type="button" key={item.id} className={selectedId === item.id ? "selected" : ""} onClick={() => onSelect(item)}>{selectedId === item.id && <Check size={14} />}{item.name}</button>)}</div>}
    {!onSelect && options.length > 0 && <div className="dripper-owned">{options.map((item) => <span className="dripper-saved" key={item.id}>{item.name}</span>)}</div>}
    <button type="button" className="dripper-browse-button" onClick={() => setOpen(!open)}><Plus size={16} /> {open ? "一覧を閉じる" : "ドリッパー一覧から追加"}</button>
    {open && <div className="dripper-catalog"><label className="dripper-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="メーカー・モデルで探す／名前を入力" maxLength={100} /></label><div className="dripper-catalog-list">{filtered.map((name) => <button type="button" key={name} disabled={busy} onClick={() => void add(name)}><Plus size={14} /> {name}</button>)}{custom && <button type="button" disabled={busy} onClick={() => void add(query.trim())}><Plus size={14} /> 「{query.trim()}」を追加</button>}{!filtered.length && !custom && <p>一致するドリッパーはありません。名前を入力して追加できます。</p>}</div></div>}
  </div>;
}
