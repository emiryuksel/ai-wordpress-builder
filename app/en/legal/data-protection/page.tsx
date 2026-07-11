import type { Metadata } from "next";

import LegalPage from "@/app/en/components/legal-page";
import { DATA_PROTECTION } from "@/lib/en/legal-content";

export const metadata: Metadata = {
  title: "Data Protection Notice",
  description:
    "Solver AI WordPress Builder data protection notice. Information about how your personal data is processed.",
  alternates: { canonical: "/en/legal/data-protection" },
};

export default function Page() {
  return <LegalPage content={DATA_PROTECTION} />;
}
