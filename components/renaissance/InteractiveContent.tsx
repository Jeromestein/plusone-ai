"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { keySession } from "@/lib/renaissance/key-transport";
import { KeyExplorer } from "./KeyExplorer";

type ArtworkPanel = { type: "merch" | "key"; x?: number; y?: number };

/** Retain the artwork interactions without an external merchandise checkout. */
export function EditionInteractions({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<ArtworkPanel | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const open = (event: Event) => {
      const value = (event as CustomEvent<ArtworkPanel>).detail;
      if (!value || !["merch", "key"].includes(value.type)) return;
      if (value.type === "key") {
        const size = Math.min(innerWidth, innerHeight) * 0.53;
        const popup = window.open(
          `/editions/winter2026/key?sid=${keySession()}`,
          "plusone_artwork_key",
          `popup,width=${Math.round(size * 4 / 3)},height=${Math.round(size)},left=${Math.round((value.x ?? screenX + innerWidth / 2) - size * 2 / 3)},top=${Math.round((value.y ?? screenY + innerHeight / 2 - 50) - size / 2)}`,
        );
        if (popup) return;
      }
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPanel(value);
    };
    window.addEventListener("renaissance:artwork", open);
    return () => window.removeEventListener("renaissance:artwork", open);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("renaissance:merch", { detail: panel?.type === "merch" }));
    if (!panel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
      if (event.key === "Tab" && dialog.current) {
        const items = [...dialog.current.querySelectorAll<HTMLElement>("button,a[href],input")].filter(el => !el.hasAttribute("disabled"));
        if (event.shiftKey && document.activeElement === items[0]) {
          event.preventDefault();
          items.at(-1)?.focus();
        } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
          event.preventDefault();
          items[0]?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      trigger.current?.focus({ preventScroll: true });
    };
  }, [panel]);

  return (
    <>
      {children}
      {panel && createPortal(
        <div className={`native-modal-backdrop native-modal-${panel.type}`} onClick={() => setPanel(null)}>
          <div ref={dialog} className="native-modal" role="dialog" aria-modal="true"
            aria-label={panel.type === "merch" ? "Interactive storefront concept" : "The key to your next chapter"}
            onClick={event => event.stopPropagation()}>
            <button className="native-modal-close" aria-label="Close artwork" onClick={() => setPanel(null)}>×</button>
            {panel.type === "merch" ? (
              <>
                <span className="native-modal-eyebrow">PlusOne AI · Concept study</span>
                <h2>A product worth exploring.</h2>
                <img className="merch-image" src="/mirror/cdn.shopify.com/s/files/1/0951/3130/4218/files/Ren-person-thumb.png" alt="Knit beanie used in this interactive artwork" />
                <p>A closer look. A detail that moves. A natural next step. Bring product storytelling and interaction together in a storefront people want to explore.</p>
                <a className="native-action" href="#ecommerce" onClick={() => setPanel(null)}>Explore our e-commerce services ↓</a>
                <small>Interactive concept demonstration.</small>
              </>
            ) : <KeyExplorer />}
          </div>
        </div>, document.body,
      )}
    </>
  );
}
