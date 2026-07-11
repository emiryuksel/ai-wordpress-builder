import type { Metadata } from "next";

import LegalPage from "@/app/components/legal-page";
import { COOKIES } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description:
    "Solver AI WordPress Builder çerez politikası. Çerezleri ve benzeri teknolojileri nasıl kullandığımızı öğrenin.",
  alternates: { canonical: "/legal/cerez-politikasi" },
};

export default function Page() {
  return <LegalPage content={COOKIES} />;
}
