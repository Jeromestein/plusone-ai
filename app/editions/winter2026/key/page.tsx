import type { Metadata } from "next";
import { KeyExplorer } from "@/components/renaissance/KeyExplorer";
import "../renaissance.css";
import "../complete-edition.css";
export const metadata: Metadata = { title: "PlusOne AI — A Key to Possibility" };
export default function KeyPage() {
  return <KeyExplorer />;
}
