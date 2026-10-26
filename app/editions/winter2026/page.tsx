import type { Metadata } from "next";
import { RenaissanceExperience } from "@/components/renaissance/RenaissanceExperience";
import { EditionContent } from "@/components/renaissance/chapters/EditionContent";
import { brand } from "@/lib/brand/content";
import "./edition-reference.css";
import "./renaissance.css";
import "./complete-edition.css";
import "./opening.css";
import "./plusone-brand.css";
import "./plusone-chapters.css";

export const metadata: Metadata = {
  title: brand.title,
  description: brand.description,
  alternates: { canonical: "/" },
};

export default function WinterEditionPage() {
  return (
    <RenaissanceExperience>
      <EditionContent />
    </RenaissanceExperience>
  );
}
