"use client";

import { useEffect, useState } from "react";
import { services, type ServiceId } from "@/lib/brand/content";

/** Track the reading position independently of the artwork renderer. */
export function useActiveService() {
  const [activeService, setActiveService] = useState<ServiceId | null>(null);

  useEffect(() => {
    const chapters = [...document.querySelectorAll<HTMLElement>("#main-content [data-nav-service]")];
    const header = document.querySelector(".plusone-header");
    let frame = 0;
    const update = () => {
      frame = 0;
      const headerBottom = header?.getBoundingClientRect().bottom ?? 68;
      const readingLine = Math.min(window.innerHeight - 1, headerBottom + Math.min(160, window.innerHeight * 0.2));
      const chapter = chapters.find((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top <= readingLine && bounds.bottom > readingLine;
      });
      const service = services.find((item) => item.id === chapter?.dataset.navService);
      setActiveService(service?.id ?? null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    chapters.forEach((chapter) => observer.observe(chapter));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
    };
  }, []);

  return activeService;
}
