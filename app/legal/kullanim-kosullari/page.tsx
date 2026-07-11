import type { Metadata } from "next";

import LegalPage from "@/app/components/legal-page";
import { TERMS } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description:
    "Solver AI WordPress Builder kullanım koşulları. Hizmeti kullanırken geçerli olan şartları ve sorumlulukları inceleyin.",
  alternates: { canonical: "/legal/kullanim-kosullari" },
};

export default function Page() {
  return <LegalPage content={TERMS} />;
}
