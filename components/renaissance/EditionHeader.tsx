"use client";

import { PlusOneMark } from "@/components/brand/PlusOneMark";
import { BackgroundMusic } from "@/components/brand/BackgroundMusic";
import { ServiceMenu } from "@/components/brand/ServiceMenu";
import { useCallback, useState } from "react";
import { services, type ServiceId, type ServiceSelection } from "@/lib/brand/content";

export function EditionHeader({ loading, onExplore, activeService }: {
  loading: boolean;
  onExplore: (selection: ServiceSelection) => void;
  activeService: ServiceId | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  return (
    <>
      <a className="skip-link" href="#plusone-introduction">Skip to main content</a>
      <header className="edition-header plusone-header">
        <a className="plusone-brand" href="#hero" aria-label="PlusOne AI home">
          <PlusOneMark loading={loading} />
          <span className="plusone-wordmark">PlusOne <span>AI</span></span>
        </a>
        <nav className="plusone-desktop-nav" aria-label="Our services">
          {services.map((service) => (
            <a key={service.id} href={`#${service.id}`} aria-current={activeService === service.id ? "location" : undefined}>
              {service.label}
            </a>
          ))}
        </nav>
        <button className="plusone-header-cta" type="button" aria-haspopup="dialog" onClick={() => onExplore("overview")}>
          Explore services <span aria-hidden="true">↗</span>
        </button>
        <BackgroundMusic />
        <button className="plusone-menu-trigger" type="button" aria-label="Open services menu" aria-haspopup="dialog"
          aria-expanded={menuOpen} aria-controls={menuOpen ? "plusone-chapter-menu" : undefined} onClick={() => setMenuOpen(true)}>
          <span /><span />
        </button>
      </header>
      {menuOpen && <ServiceMenu activeService={activeService} onClose={closeMenu}
        onExplore={() => { setMenuOpen(false); onExplore("overview"); }} />}
    </>
  );
}
