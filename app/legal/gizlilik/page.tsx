import type { Metadata } from "next";

import LegalPage from "@/app/components/legal-page";
import { PRIVACY } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "Solver AI WordPress Builder gizlilik politikası. Kişisel verilerinizi nasıl topladığımızı, işlediğimizi ve koruduğumuzu öğrenin.",
  alternates: { canonical: "/legal/gizlilik" },
};

export default function Page() {
  return <LegalPage content={PRIVACY} />;
}
