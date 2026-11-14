import { useEffect, useLayoutEffect, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { C, REACTIONS } from "../../ClimbMatchCore.jsx";

export interface ReactionPickerProps {
  /** The control the bar floats over: the Like button, the React link or the reaction count. */
  anchor: HTMLElement | null;
  /** The reaction you already gave, drawn pressed; tapping it again takes it back (the caller toggles). */
  current?: string | null;
  /** Opened by resting the mouse on the anchor: the bar then also leaves when the mouse leaves it and the anchor. */
  hover?: boolean;
  /** Called with the reaction's key (`REACTIONS[].k`). */
  onPick: (key: string) => void;
  onClose: () => void;
}

const COLS = 7, CELL = 40, PAD = 6;
const BAR_W = COLS * CELL + PAD * 2;
const ROWS = Math.ceil(REACTIONS.length / COLS);
const BAR_H = ROWS * CELL + PAD * 2;
/** Emoji only — the owner asked for the emoji back without a word under each (2026-11-05). The word is the button's accessible name. */
const HOLD_MS = 450, ENTER_MS = 500, LEAVE_MS = 350;

/**
 * Facebook's reaction bar: a floating pill of emoji that pops up over the control that opened it — rest the mouse on
 * Like, press and hold it on a phone, right-click it, or tap the reaction count or React. Emoji only, 7 to a row, the
 * one you gave sits on a blue disc, and the pointer swells the one under it. It is NOT a dialog: nothing dims, the page
 * stays where it is, a tap anywhere else, Escape or a scroll closes it, and when the mouse opened it the mouse leaving
 * closes it too. Portalled to document.body like every overlay inside #appscroll (check:overlays); z 9700 like the
 * sheet it replaced, under the toast (check:zindex).
 */
export default function ReactionPicker({ anchor, current, hover, onPick, onClose }: ReactionPickerProps) {
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const [shown, setShown] = useState(false);
  const [hot, setHot] = useState<string | null>(null);
  const [foc, setFoc] = useState<string | null>(null);
  const [bar, setBar] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!anchor) { setPos({ left: 8, top: 8, up: false }); return; }
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.max(8, Math.min(r.left, vw - 8 - BAR_W));
    const up = r.top - BAR_H - 10 >= 8 || r.bottom + BAR_H + 10 > vh;
    const top = up ? Math.max(8, r.top - BAR_H - 10) : r.bottom + 10;
    setPos({ left, top, up });
  }, [anchor]);

  // The pop: from 70% at the anchor's corner to full size, as Facebook's does.
  useEffect(() => { const t = window.setTimeout(() => setShown(true), 10); return () => window.clearTimeout(t); }, []);

  // Leave: Escape, a press anywhere outside the bar and its anchor, or the page scrolling under it.
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    const down = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (bar && t && bar.contains(t)) return;
      if (anchor && t && anchor.contains(t)) return;
      onClose();
    };
    const scroll = () => onClose();
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("pointerdown", down, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, [bar, anchor, onClose]);

  // Opened by the mouse resting on the anchor: it leaves once the mouse has been off both for a moment.
  useEffect(() => {
    if (!hover) return;
    let timer = 0;
    const inside = (el: Element | null, x: number, y: number, pad: number) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
    };
    const move = (e: MouseEvent) => {
      const over = inside(bar, e.clientX, e.clientY, 14) || inside(anchor, e.clientX, e.clientY, 10);
      if (over) { if (timer) { window.clearTimeout(timer); timer = 0; } return; }
      if (!timer) timer = window.setTimeout(onClose, LEAVE_MS);
    };
    document.addEventListener("mousemove", move);
    return () => { document.removeEventListener("mousemove", move); if (timer) window.clearTimeout(timer); };
  }, [hover, bar, anchor, onClose]);

  // Opened from the keyboard (React, the count): focus lands on your reaction, else the first; arrows walk the row.
  useEffect(() => {
    if (hover || !bar) return;
    const btn = (bar.querySelector('button[aria-pressed="true"]') || bar.querySelector("button")) as HTMLButtonElement | null;
    if (btn) btn.focus({ preventScroll: true });
  }, [hover, bar]);
  const walk = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS };
    const d = step[e.key];
    if (!d || !bar) return;
    const all = Array.from(bar.querySelectorAll("button")) as HTMLButtonElement[];
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    const n = all[(i + d + all.length) % all.length];
    if (n) { e.preventDefault(); n.focus(); }
  };

  if (!pos) return null;
  return createPortal(
    <div ref={setBar} role="group" aria-label="React" onKeyDown={walk}
      style={{ position: "fixed", left: pos.left, top: pos.top, width: BAR_W, zIndex: 9700, boxSizing: "border-box", padding: PAD, display: "grid", gridTemplateColumns: "repeat(" + COLS + "," + CELL + "px)", background: C.card, border: "1px solid " + C.borderHi, borderRadius: 24, boxShadow: "0 6px 24px rgba(0,0,0,0.45)", transformOrigin: pos.up ? "left bottom" : "left top", transform: shown ? "scale(1)" : "scale(0.7)", opacity: shown ? 1 : 0, transition: "transform 0.14s cubic-bezier(0.2,0.9,0.3,1.3), opacity 0.1s" }}>
      {REACTIONS.map(function (r) {
        const mine = current === r.k, big = hot === r.k, ring = foc === r.k;
        // The swell is the mouse's; a keyboard walking the bar gets a ring (only on :focus-visible, so the focus the
        // bar takes when it opens after a press does not draw one).
        return (
          <button key={r.k} type="button" onClick={() => onPick(r.k)} aria-label={r.l} title={r.l} aria-pressed={mine}
            onMouseEnter={() => setHot(r.k)} onMouseLeave={() => setHot(h => (h === r.k ? null : h))}
            onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setFoc(r.k); }} onBlur={() => setFoc(f => (f === r.k ? null : f))}
            style={{ width: CELL, height: CELL, padding: 0, border: "none", borderRadius: "50%", background: mine ? C.blueDim : "transparent", cursor: "pointer", fontSize: 26, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", transform: big ? "scale(1.3) translateY(-4px)" : "scale(1)", transition: "transform 0.12s ease-out", outline: "none", boxShadow: ring ? "inset 0 0 0 2px " + C.blue : "none" }}>
            <span aria-hidden="true">{r.e}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

/* ---- The trigger: how Like opens the bar ---- */

interface TriggerState { hold: number; enter: number; held: boolean }
const STATE = new WeakMap<HTMLElement, TriggerState>();
const st = (el: HTMLElement) => { let s = STATE.get(el); if (!s) { s = { hold: 0, enter: 0, held: false }; STATE.set(el, s); } return s; };

export interface ReactionTriggerProps {
  onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerEnter: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * Facebook's Like button, as handler props for a `<button>`: a tap runs `tap` (toggle the thumbs-up); resting the
 * mouse on it for half a second, pressing and holding it on a phone, or right-clicking it opens the bar through
 * `open(el, byHover)`. The hold is 450ms, under the platform's own long-press menu, and the button should carry
 * `WebkitTouchCallout:"none"` + `userSelect:"none"` so the phone does not select its text instead. A tap that ended a
 * hold is not also a toggle. Nothing here needs a long press: every caller also gives the bar a plain button.
 */
export function reactionTrigger(open: (el: HTMLElement, byHover: boolean) => void, tap: () => void): ReactionTriggerProps {
  const clear = (el: HTMLElement) => { const s = st(el); if (s.hold) { window.clearTimeout(s.hold); s.hold = 0; } };
  const clearEnter = (el: HTMLElement) => { const s = st(el); if (s.enter) { window.clearTimeout(s.enter); s.enter = 0; } };
  return {
    onClick: (e) => { const s = st(e.currentTarget); if (s.held) { s.held = false; return; } tap(); },
    onPointerDown: (e) => {
      const el = e.currentTarget; const s = st(el); s.held = false; clear(el); clearEnter(el);
      if (e.button !== 0 && e.pointerType === "mouse") return;
      s.hold = window.setTimeout(() => { s.held = true; s.hold = 0; open(el, false); }, HOLD_MS);
    },
    onPointerUp: (e) => clear(e.currentTarget),
    onPointerLeave: (e) => { clear(e.currentTarget); clearEnter(e.currentTarget); },
    onPointerCancel: (e) => clear(e.currentTarget),
    onPointerEnter: (e) => {
      if (e.pointerType !== "mouse") return;
      const el = e.currentTarget; const s = st(el); clearEnter(el);
      s.enter = window.setTimeout(() => { s.enter = 0; open(el, true); }, ENTER_MS);
    },
    onContextMenu: (e) => { e.preventDefault(); clear(e.currentTarget); clearEnter(e.currentTarget); open(e.currentTarget, false); },
    onKeyDown: (e) => { st(e.currentTarget).held = false; },
  };
}
