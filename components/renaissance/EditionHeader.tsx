"use client";

import { PlusOneMark } from "@/components/brand/PlusOneMark";
import { BackgroundMusic } from "@/components/brand/BackgroundMusic";
import { services, type ServiceSelection } from "@/lib/brand/content";

export function EditionHeader({ loading, onExplore }: {
  loading: boolean;
  onExplore: (selection: ServiceSelection) => void;
}) {
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
            <button key={service.id} type="button" aria-haspopup="dialog" onClick={() => onExplore(service.id)}>
              {service.label}
            </button>
          ))}
        </nav>
        <button className="plusone-header-cta" type="button" aria-haspopup="dialog" onClick={() => onExplore("overview")}>
          Explore services <span aria-hidden="true">↗</span>
        </button>
        <BackgroundMusic />
        <button className="plusone-menu-trigger" type="button" aria-label="Open services menu" aria-haspopup="dialog" onClick={() => onExplore("overview")}>
          <span /><span />
        </button>
      </header>
    </>
  );
}
