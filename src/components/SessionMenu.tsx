// Peak — a small reusable "⋯" overflow menu. The session feed card and the
// full-page session detail header both use it for Edit / Remove. The dropdown is
// rendered in a PORTAL anchored to the trigger's viewport rect, so it's never
// clipped by an ancestor's `overflow: hidden` (the feed card clips its body) and
// always paints above the rest of the UI. Destructive items take a `confirmLabel`
// for a two-tap guard (no native confirm dialog, matching the app's language).

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../theme";

export type MenuAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  confirmLabel?: string;   // when set, first tap arms; second tap fires (two-tap guard)
};

type Anchor = { top: number; right: number };

export function EllipsisMenu({
  actions,
  size = 30,
  round = false,
  ariaLabel = "Session actions",
}: {
  actions: MenuAction[];
  size?: number;
  round?: boolean;
  ariaLabel?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const open = anchor != null;

  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };
  const close = () => {
    setAnchor(null);
    setArmed(null);
  };

  // Keep the dropdown pinned to the trigger; close if the page scrolls/resizes
  // out from under it (cheap + avoids a stale fixed position).
  useLayoutEffect(() => {
    if (!open) return;
    const onShift = () => close();
    window.addEventListener("scroll", onShift, true);
    window.addEventListener("resize", onShift);
    return () => {
      window.removeEventListener("scroll", onShift, true);
      window.removeEventListener("resize", onShift);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (open) close();
          else place();
        }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          cursor: "pointer",
          borderRadius: round ? "50%" : 10,
          border: `1px solid ${C.line2}`,
          background: round ? C.card : C.inner,
          color: C.ink2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="3.3" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="12.7" cy="8" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {open && anchor && createPortal(
        <>
          {/* outside-click catcher */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
          />
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: anchor.top,
              right: anchor.right,
              zIndex: 9999,
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              padding: 6,
              minWidth: 172,
              boxShadow: "0 16px 40px -12px rgba(0,0,0,0.7)",
            }}
          >
            {actions.map((a, i) => {
              const arming = armed === i;
              return (
                <button
                  key={a.label}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (a.confirmLabel && !arming) {
                      setArmed(i);
                      return;
                    }
                    close();
                    a.onClick();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 9,
                    border: "none",
                    background: arming ? `${C.red}14` : "transparent",
                    cursor: "pointer",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: a.danger || arming ? C.red : C.ink2,
                  }}
                >
                  {arming ? a.confirmLabel : a.label}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
