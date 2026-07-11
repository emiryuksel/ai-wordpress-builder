import type { Metadata } from "next";

import LegalPage from "@/app/en/components/legal-page";
import { PRIVACY } from "@/lib/en/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Solver AI WordPress Builder privacy policy. Learn how we collect, process and protect your personal data.",
  alternates: { canonical: "/en/legal/privacy" },
};

export default function Page() {
  return <LegalPage content={PRIVACY} />;
}
