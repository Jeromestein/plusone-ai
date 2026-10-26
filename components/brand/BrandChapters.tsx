import { artworkScenes, brandChapters } from "@/lib/brand/chapters";
import { services } from "@/lib/brand/content";
import rives from "@/lib/renaissance/data/rives.json";
import { RiveArtwork } from "@/components/renaissance/RiveArtwork";
import { ExploreServicesButton } from "./ExploreServicesButton";
import { ServiceStudy } from "./ServiceStudy";

export function BrandChapters() {
  return (
    <>
      {brandChapters.map((chapter, index) => {
        const binding = artworkScenes[chapter.scene];
        const service = services.find((item) => item.id === chapter.service);
        return (
          <section key={chapter.scene} id={binding.section} className="plusone-chapter"
            data-section-id={binding.section} data-artwork-scene={chapter.scene} data-nav-service={chapter.service} tabIndex={-1}
            aria-labelledby={`${binding.section}-title`}>
            <div className="plusone-chapter-content">
              <div className="plusone-chapter-opening" data-nav-theme={chapter.scene === "developer" ? "light" : "dark"}>
                <p className="plusone-chapter-kicker"><span>{String(index + 1).padStart(2, "0")}</span> {chapter.label}</p>
                <h2 id={`${binding.section}-title`} tabIndex={-1} className="plusone-chapter-title">
                  <span>{chapter.title[0]}</span><em>{chapter.title[1]}</em>
                </h2>
                <p className="plusone-chapter-intro">{chapter.intro}</p>
              </div>
              <div className="plusone-chapter-paper" data-nav-theme="light" data-nav-style="solid">
                <div className="plusone-chapter-heading">
                  <p className="plusone-eyebrow">The possibilities</p>
                  <h3>{chapter.heading}</h3>
                  <p>{chapter.lead}</p>
                </div>
                {chapter.study && <ServiceStudy kind={chapter.study} />}
                <div className="plusone-offerings">
                  {chapter.offerings.map((offering) => (
                    <article key={offering.title}>
                      <h4>{offering.title}</h4>
                      <p>{offering.description}</p>
                      <ul>{offering.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                    </article>
                  ))}
                </div>
                {chapter.platform === "shopify" && (
                  <div className="plusone-platform-study">
                    <figure>
                      <RiveArtwork config={rives["personalized-shop-pay-button"]} />
                      <figcaption>Shopify platform illustration · Shop Pay</figcaption>
                    </figure>
                    <div>
                      <p className="plusone-eyebrow">Built around your store</p>
                      <h4>Thoughtful details along the way.</h4>
                      <p>From product information to familiar payment options, we help configure a shopping journey that works for your store and customers.</p>
                      <p className="plusone-platform-note">Available features depend on your Shopify plan, market, and payment setup.</p>
                    </div>
                  </div>
                )}
                <div className="plusone-chapter-bottom">
                  <ExploreServicesButton selection={chapter.service}>{service ? `Explore ${service.label}` : "Explore our services"}</ExploreServicesButton>
                  <a className="plusone-back-link" href="#hero">Back to the beginning ↑</a>
                </div>
              </div>
            </div>
          </section>
        );
      })}
      <footer className="plusone-footer" data-nav-theme="light" data-nav-style="solid">
        <p className="plusone-eyebrow">PlusOne AI</p>
        <p className="plusone-footer-title">Your next chapter<br /><em>starts with an idea.</em></p>
        <ExploreServicesButton>Find your starting point</ExploreServicesButton>
        <nav aria-label="Service chapters">{services.map((service) => <a key={service.id} href={`#${service.id}`}>{service.label}</a>)}</nav>
        <div className="plusone-footer-note"><span>© 2026 PlusOne AI</span><span>Independent thinking. Digital craft.</span><a href="#hero">Back to top ↑</a></div>
      </footer>
    </>
  );
}
