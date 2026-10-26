"use client";

import { useEffect, useRef } from "react";
import { services, type ServiceSelection } from "@/lib/brand/content";
import { PlusOneMark } from "./PlusOneMark";

export function ServicesDialog({ selection, onClose }: { selection: ServiceSelection; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    closeButton.current?.focus();
    if (selection !== "overview") {
      element.querySelector(`[data-service="${selection}"]`)?.scrollIntoView({ block: "nearest" });
    }
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [selection]);

  return (
    <dialog ref={dialog} className="plusone-services-dialog" aria-labelledby="plusone-services-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="plusone-dialog-content">
        <div className="plusone-dialog-top">
          <span className="plusone-dialog-brand"><PlusOneMark /> PlusOne AI</span>
          <button ref={closeButton} type="button" className="plusone-dialog-close" onClick={onClose} aria-label="Close services">Close <span aria-hidden="true">×</span></button>
        </div>
        <p className="plusone-eyebrow">Ideas into possibility.</p>
        <h2 id="plusone-services-title">What can we <em>create?</em></h2>
        <div className="plusone-service-details">
          {services.map((service) => (
            <section key={service.id} data-service={service.id} data-selected={selection === service.id}>
              <span className="plusone-service-numeral" aria-hidden="true">{service.numeral}</span>
              <div>
                <h3>{service.label}</h3>
                <p className="plusone-service-intro">{service.description}</p>
                <p>{service.detail}</p>
                <ul aria-label={`${service.label} capabilities`}>
                  {service.capabilities.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <a className="plusone-dialog-service-link" href={`#${service.id}`} onClick={onClose}>Explore this service ↓</a>
              </div>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
