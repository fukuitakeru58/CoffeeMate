"use client";

import { useEffect, useRef, useState } from "react";
import { Coffee, Home, Info, Menu, UserRound, X } from "lucide-react";

export default function SiteMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") setOpen(false);
      if (event instanceof MouseEvent && root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  return <div className="site-menu" ref={root}><button type="button" className="site-menu-trigger" aria-label="メニュー" aria-expanded={open} aria-controls="site-menu-links" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>{open && <nav id="site-menu-links" className="site-menu-panel" aria-label="サイト内メニュー"><a href="/"><Home size={17} /> ホーム</a><a href="/me"><UserRound size={17} /> マイページ</a><a href="/beans"><Coffee size={17} /> コーヒー豆</a><a href="/about"><Info size={17} /> サイトについて</a></nav>}</div>;
}
