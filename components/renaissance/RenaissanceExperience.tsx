"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditionHeader } from "./EditionHeader";
import { HeroNavigation } from "./HeroNavigation";
import { EditionInteractions } from "./InteractiveContent";
import { CompositionGrid } from "./CompositionGrid";
import { useOpeningSequence } from "./useOpeningSequence";
import { fallbackImages } from "@/lib/renaissance/assets";
import type { Stage } from "@/lib/renaissance/create-stage";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import { ServicesDialog } from "@/components/brand/ServicesDialog";
import type { ServiceSelection } from "@/lib/brand/content";
import { services } from "@/lib/brand/content";
import { artworkScenes, type ArtworkScene } from "@/lib/brand/chapters";

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function RenaissanceExperience({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [servicePanel, setServicePanel] = useState<ServiceSelection | null>(null);
  const opening = useOpeningSequence(status);

  useEffect(() => {
    const openServices = (event: Event) => {
      const selection = (event as CustomEvent<string>).detail;
      if (selection === "overview" || services.some((service) => service.id === selection))
        setServicePanel(selection as ServiceSelection);
    };
    window.addEventListener("plusone:services", openServices);
    return () => window.removeEventListener("plusone:services", openServices);
  }, []);

  useEffect(() => {
    if (!canvas) return;
    const controller = new AbortController();
    let stage: Stage | undefined,
      frameId = 0,
      scroll = window.scrollY,
      previousScroll = -1;
    let width = window.innerWidth,
      height = window.innerHeight;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      previousScroll = -1;
      stage?.resize(width, height);
    };
    const pointer = (event: PointerEvent) =>
      stage?.pointer(
        (event.clientX / width) * 2 - 1,
        (event.clientY / height) * 2 - 1,
      );
    const leave = () => stage?.pointer(0, 0);
    const surface = canvas;
    const contextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frameId);
      setStatus("fallback");
    };
    surface?.addEventListener("webglcontextlost", contextLost);
    function animate(now: number) {
      if (controller.signal.aborted) return;
      const target = window.scrollY;
      scroll = motion.matches ? target : mix(scroll, target, 0.16);
      if (Math.abs(scroll - target) < 0.05) scroll = target;
      if (root.current && Math.abs(previousScroll - scroll) > 0.01) {
        root.current.style.setProperty("--scroll", `${scroll}px`);
        const drawing = root.current.querySelector<HTMLElement>(
          '[data-section-name="side-and-lines"]',
        );
        if (drawing) drawing.dataset.scrolled = String(scroll > 100);
        root.current.dataset.headerScrolled = String(scroll > height);
        const sections = [
          ...document.querySelectorAll<HTMLElement>("[data-section-id]"),
        ];
        const chapter = sections.find(
          (el) =>
            el.getBoundingClientRect().bottom > height * 0.5 &&
            el.getBoundingClientRect().top < height * 0.5,
        );
        const scene = (chapter?.dataset.artworkScene || "hero") as ArtworkScene;
        const presentation = artworkScenes[scene] || artworkScenes.hero;
        const index = presentation.index;
        const grid =
          root.current.querySelector<SVGElement>(".composition-grid");
        const group = presentation.grid;
        if (grid && grid.dataset.active !== group) {
          grid.dataset.animating = grid.dataset.shown ? "" : group;
          grid.dataset.active = group;
          grid.dataset.shown = [
            ...new Set([
              ...(grid.dataset.shown || "").split(",").filter(Boolean),
              group,
            ]),
          ].join(",");
        }
        const themed = [
          ...document.querySelectorAll<HTMLElement>(
            "[data-nav-theme], [data-section-id] .bg-light",
          ),
        ];
        const themeAt = (y: number, x?: number) =>
          themed.find((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top <= y && rect.bottom > y &&
              (x === undefined || (rect.left <= x && rect.right > x));
          });
        const headerTheme = themeAt(30),
          sidebarTheme = themeAt(height - 180);
        const themeName = (element?: HTMLElement) =>
          element?.dataset.navTheme ||
          (element?.classList.contains("bg-light") || index === 12
            ? "light"
            : "dark");
        root.current.dataset.theme = themeName(sidebarTheme);
        const brandSidebar = root.current.querySelector(".plusone-hero-frame")?.getBoundingClientRect();
        root.current.dataset.brandSidebarTheme = themeName(
          brandSidebar ? themeAt(brandSidebar.top + brandSidebar.height / 2) : sidebarTheme,
        );
        root.current.dataset.headerTheme = themeName(headerTheme);
        root.current.dataset.headerSolid =
          headerTheme?.dataset.navStyle === "solid" ||
          headerTheme?.classList.contains("bg-light")
            ? "true"
            : "false";
        root.current.style.setProperty(
          "--fallback-image",
          `url("${fallbackImages[index][width < 768 ? 1 : 0]}")`,
        );
        document
          .querySelectorAll<HTMLAnchorElement>(".plusone-service-navigation a")
          .forEach((a) => {
            if (a.hash === `#${chapter?.id}`)
              a.setAttribute("aria-current", "location");
            else a.removeAttribute("aria-current");
          });
        previousScroll = scroll;
      }
      stage?.frame(
        scroll,
        now / 1000,
        motion.matches,
        opening.clock.current.skipCamera,
      );
      frameId = requestAnimationFrame(animate);
    }
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("pointerleave", leave);
    setStatus("loading");
    const loadingTimeout = setTimeout(() => setStatus("fallback"), 15000);
    import("@/lib/renaissance/create-stage")
      .then(({ createStage }) => {
        if (controller.signal.aborted || !canvas) return;
        return createStage(canvas, controller.signal);
      })
      .then((instance) => {
        if (!instance) return;
        if (controller.signal.aborted) {
          instance.dispose();
          return;
        }
        clearTimeout(loadingTimeout);
        stage = instance;
        stage.resize(width, height);
        setStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        clearTimeout(loadingTimeout);
        console.error("Renaissance scene could not initialize", error);
        setStatus("fallback");
      });
    frameId = requestAnimationFrame(animate);
    return () => {
      clearTimeout(loadingTimeout);
      controller.abort();
      cancelAnimationFrame(frameId);
      surface?.removeEventListener("webglcontextlost", contextLost);
      stage?.dispose();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointer);
      document.removeEventListener("pointerleave", leave);
    };
  }, [attempt, canvas, opening.clock]);

  return (
    <EditionInteractions>
      <div
        ref={root}
        className="renaissance-experience"
        data-renderer="native-next-three"
        data-status={status}
        data-opening={opening.phase}
        data-initiated={opening.initiated}
      >
        <div className="painting-stage" aria-hidden="true">
          <div className="painting-fallback" />
          <canvas key={attempt} ref={setCanvas} />
        </div>
        <EditionHeader loading={status === "loading"} onExplore={setServicePanel} />
        <div
          className="plusone-opening-mark"
          aria-hidden={opening.phase === "revealing" || opening.phase === "complete"}
        >
          <PlusOneMark loading={status === "loading"} />
          <span className="plusone-wordmark">PlusOne <span>AI</span></span>
          <span className="plusone-loading-caption">A new perspective awaits.</span>
        </div>
        <button
          className="artwork-accessible"
          onClick={() => {
            document.getElementById("shopify")?.scrollIntoView();
            window.dispatchEvent(
              new CustomEvent("renaissance:artwork", {
                detail: { type: "merch", id: "" },
              }),
            );
          }}
        >
          Explore the interactive storefront concept
        </button>
        <button
          className="artwork-accessible"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("renaissance:artwork", {
                detail: { type: "key", id: "" },
              }),
            )
          }
        >
          Explore the interactive key artwork
        </button>
        <div
          data-section-name="side-and-lines"
          data-initiated={opening.initiated}
          data-scrolled="false"
          data-sidebar-loaded={opening.phase !== "drawing"}
          data-sidebar-ready={
            opening.phase === "revealing" || opening.phase === "complete"
          }
        >
          <CompositionGrid />
          <HeroNavigation onExplore={setServicePanel} />
        </div>
        <main id="main-content">
          <section
            id="hero"
            data-artwork-scene="hero"
            className="hero-section"
            aria-label="PlusOne AI — A new era for your business"
          ></section>
          {children}
        </main>
        {status === "fallback" && (
          <div className="scene-notice" role="status">
            The interactive artwork could not load.{" "}
            <button onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </div>
        )}
        {servicePanel && (
          <ServicesDialog selection={servicePanel} onClose={() => setServicePanel(null)} />
        )}
      </div>
    </EditionInteractions>
  );
}
