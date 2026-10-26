"use client";

import { useEffect, useRef } from "react";
import { services, type ServiceId } from "@/lib/brand/content";

export function ServiceMenu({ activeService, onClose, onExplore }: {
  activeService: ServiceId | null;
  onClose: () => void;
  onExplore: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1081px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      element.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <dialog ref={dialog} id="plusone-chapter-menu" className="plusone-services-dialog plusone-chapter-menu"
      aria-labelledby="plusone-menu-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="plusone-dialog-content">
        <div className="plusone-dialog-top">
          <span className="plusone-eyebrow">PlusOne AI · Chapters</span>
          <button type="button" className="plusone-dialog-close" onClick={onClose} aria-label="Close navigation">Close <span aria-hidden="true">×</span></button>
        </div>
        <h2 id="plusone-menu-title">Find your<br /><em>next chapter.</em></h2>
        <nav className="plusone-service-navigation" aria-label="Service chapters">
          <ul>{services.map((service) => (
            <li key={service.id}>
              <a className="plusone-service-link" href={`#${service.id}`} onClick={onClose}
                aria-current={activeService === service.id ? "location" : undefined}>
                <span className="plusone-service-marker" aria-hidden="true">+</span>
                <span className="plusone-service-label">{service.label}</span>
                <span className="chapter-numeral" aria-hidden="true">{service.numeral}</span>
              </a>
            </li>
          ))}</ul>
        </nav>
        <button className="plusone-hero-cta" type="button" onClick={onExplore}>Explore our services <span aria-hidden="true">↗</span></button>
      </div>
    </dialog>
  );
}
