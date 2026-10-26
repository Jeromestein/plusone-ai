"use client";

import type { ReactNode } from "react";
import type { ServiceSelection } from "@/lib/brand/content";

export function ExploreServicesButton({ selection = "overview", children = "Explore our services" }: {
  selection?: ServiceSelection;
  children?: ReactNode;
}) {
  return (
    <button className="plusone-text-link" type="button" aria-haspopup="dialog"
      onClick={() => window.dispatchEvent(new CustomEvent("plusone:services", { detail: selection }))}>
      {children} <span aria-hidden="true">↗</span>
    </button>
  );
}
