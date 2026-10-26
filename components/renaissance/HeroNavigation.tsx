import type { CSSProperties } from "react";
import { services, type ServiceId, type ServiceSelection } from "@/lib/brand/content";

export function HeroNavigation({ onExplore, activeService }: { onExplore: (selection: ServiceSelection) => void; activeService: ServiceId | null }) {
  return (
    <aside className="hero-navigation plusone-hero-navigation" data-section-name="side-nav" aria-label="Introducing PlusOne AI">
      <div className="hero-navigation-frame plusone-hero-frame">
        <svg className="hero-frame davinci-lines" viewBox="550 208 340 464" fill="none" aria-hidden="true">
          <rect className="davinci-lines__border" x="550" y="208" width="340" height="464" stroke="currentColor" />
        </svg>
        <div className="plusone-hero-heading">
          <p className="plusone-eyebrow">Human imagination. New possibilities.</p>
          <h1 id="plusone-introduction" className="plusone-hero-title" tabIndex={-1}>A new era<br />for your<br /><em>business.</em></h1>
        </div>
        <div className="plusone-hero-body">
          <p className="plusone-hero-description">We build AI tools, websites, apps, and online stores — and help businesses grow.</p>
          <nav className="plusone-service-navigation" aria-label="Service chapters">
            <ul>
              {services.map((service, index) => (
                <li key={service.id} style={{ "--index": index + 1 } as CSSProperties}>
                  <a className="plusone-service-link" href={`#${service.id}`} aria-current={activeService === service.id ? "location" : undefined}>
                    <span className="plusone-service-marker" aria-hidden="true">+</span>
                    <span className="plusone-service-label">{service.label}</span>
                    <span className="chapter-numeral" aria-hidden="true">{service.numeral}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <button className="plusone-hero-cta" type="button" aria-haspopup="dialog" onClick={() => onExplore("overview")}>
            Explore our services <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
      <div className="edition-legal terms-of-service plusone-signature">
        <p>© 2026 PlusOne AI</p>
        <p>Independent thinking. Digital craft.</p>
      </div>
    </aside>
  );
}
