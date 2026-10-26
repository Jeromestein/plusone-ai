import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand/content";

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: brand.title,
  description: brand.description,
  icons: { icon: { url: "/brand/plusone-icon.svg", type: "image/svg+xml" } },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
