"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Clock3, X } from "lucide-react";

type Props = { label: string; value: number | null; onChange: (seconds: number | null) => void; compact?: boolean; allowClear?: boolean };

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0));
const format = (value: number | null) => value === null ? "未記録" : `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

function DigitWheel({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (digit: number) => void }) {
  const [offset, setOffset] = useState(0);
  const valueRef = useRef(value);
  const motion = useRef<{ y: number; time: number; velocity: number; offset: number; moved: boolean } | null>(null);
  const frame = useRef<number | null>(null);
  const step = 42;
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  function stop() { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }
  function turn(delta: number) { const next = (valueRef.current + delta + max + 1) % (max + 1); valueRef.current = next; onChange(next); }
  function move(delta: number) {
    const current = motion.current;
    if (!current) return;
    current.offset += delta;
    const crossed = Math.trunc(current.offset / step);
    if (crossed) { turn(-crossed); current.offset -= crossed * step; }
    setOffset(current.offset);
  }
  function release() {
    const current = motion.current;
    if (!current) return;
    const velocity = current.velocity;
    if (!current.moved) { motion.current = null; setOffset(0); return; }
    if (Math.abs(velocity) < 0.15 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { motion.current = null; setOffset(0); return; }
    let last = performance.now();
    let speed = Math.max(-1.8, Math.min(1.8, velocity));
    const tick = (now: number) => {
      const elapsed = Math.min(32, now - last); last = now;
      move(speed * elapsed);
      speed *= Math.exp(-elapsed / 230);
      if (Math.abs(speed) < 0.025) { motion.current = null; setOffset(0); frame.current = null; }
      else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }
  return <div className="time-digit-wheel">
    <button type="button" className="time-digit-arrow" onClick={() => { stop(); turn(-1); }} aria-label={`${label}を一つ戻す`}><ChevronUp size={19} /></button>
    <div className="time-digit-track" role="spinbutton" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
      onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); stop(); turn(-1); } if (event.key === "ArrowDown") { event.preventDefault(); stop(); turn(1); } }}
      onPointerDown={(event) => { stop(); motion.current = { y: event.clientY, time: performance.now(), velocity: 0, offset: 0, moved: false }; setOffset(0); event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { const current = motion.current; if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return; const now = performance.now(); const delta = event.clientY - current.y; const elapsed = Math.max(1, now - current.time); current.velocity = current.velocity * 0.35 + (delta / elapsed) * 0.65; current.y = event.clientY; current.time = now; if (Math.abs(delta) > 0) current.moved = true; move(delta); }}
      onPointerUp={release} onPointerCancel={() => { stop(); motion.current = null; setOffset(0); }}>
      <span aria-hidden="true" style={{ transform: `translateY(${offset}px)` }}>{(value + max) % (max + 1)}</span><strong style={{ transform: `translateY(${offset}px)` }}>{value}</strong><span aria-hidden="true" style={{ transform: `translateY(${offset}px)` }}>{(value + 1) % (max + 1)}</span>
    </div>
    <button type="button" className="time-digit-arrow" onClick={() => { stop(); turn(1); }} aria-label={`${label}を一つ進める`}><ChevronDown size={19} /></button>
  </div>;
}

export default function TimePicker({ label, value, onChange, compact = false, allowClear = false }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? 0);
  const [mode, setMode] = useState<"dial" | "keyboard">("dial");
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [open]);

  function openPicker() { setDraft(value ?? 0); setMode("dial"); setOpen(true); }
  function digitAt(index: number) { const minutes = Math.floor(draft / 60); const seconds = draft % 60; return [Math.floor(minutes / 10), minutes % 10, Math.floor(seconds / 10), seconds % 10][index]; }
  function setDigit(index: number, next: number) {
    setDraft((current) => {
      const minutes = Math.floor(current / 60); const seconds = current % 60;
      const digits = [Math.floor(minutes / 10), minutes % 10, Math.floor(seconds / 10), seconds % 10];
      digits[index] = next;
      return (digits[0] * 10 + digits[1]) * 60 + digits[2] * 10 + digits[3];
    });
  }
  function setPart(part: "minute" | "second", next: string) {
    const parsed = clamp(Number(next), part === "minute" ? 99 : 59);
    setDraft(part === "minute" ? parsed * 60 + draft % 60 : Math.floor(draft / 60) * 60 + parsed);
  }

  return <div className={`time-picker-field${compact ? " compact" : ""}`}>
    {!compact && <span className="time-picker-label">{label}</span>}
    <button type="button" className="time-picker-trigger" onClick={openPicker} aria-label={`${label}：${format(value)}。時間を選ぶ`}><Clock3 size={17} /><strong>{format(value)}</strong><span>{compact ? "変更" : "ダイアルで設定"}</span></button>
    {open && typeof document !== "undefined" && createPortal(<div className="time-picker-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="time-picker-dialog" role="dialog" aria-modal="true" aria-label={`${label}を選択`}>
        <div className="time-picker-head"><div><span>BREW TIME</span><h3>{label}</h3></div><button type="button" onClick={() => setOpen(false)} aria-label="閉じる"><X size={20} /></button></div>
        <div className="time-picker-modes" role="tablist" aria-label="時間の入力方法"><button type="button" role="tab" aria-selected={mode === "dial"} className={mode === "dial" ? "selected" : ""} onClick={() => setMode("dial")}>ダイアル</button><button type="button" role="tab" aria-selected={mode === "keyboard"} className={mode === "keyboard" ? "selected" : ""} onClick={() => setMode("keyboard")}>キーボード</button></div>
        {mode === "dial" ? <><p className="time-picker-hint">数字を上下にスワイプ、または矢印で調整</p><div className="time-wheel-row">{["分の十の位", "分の一の位", "秒の十の位", "秒の一の位"].map((digitLabel, index) => <div className="time-wheel-slot" key={digitLabel}>{index === 2 && <span className="time-wheel-colon">:</span>}<DigitWheel label={digitLabel} value={digitAt(index)} max={index === 2 ? 5 : 9} onChange={(next) => setDigit(index, next)} /></div>)}</div><div className="time-wheel-units"><span>分</span><span>秒</span></div></> : <div className="time-keyboard-row"><label>分<input type="number" min="0" max="99" inputMode="numeric" value={Math.floor(draft / 60)} onChange={(event) => setPart("minute", event.target.value)} /></label><span>:</span><label>秒<input type="number" min="0" max="59" inputMode="numeric" value={draft % 60} onChange={(event) => setPart("second", event.target.value)} /></label></div>}
        <div className="time-picker-footer">{allowClear && <button type="button" className="time-picker-clear" onClick={() => { onChange(null); setOpen(false); }}>未記録に戻す</button>}<button type="button" className="primary-button" onClick={() => { onChange(draft); setOpen(false); }}>{format(draft)} に設定</button></div>
      </div>
    </div>, document.body)}
  </div>;
}
