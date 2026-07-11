import type { Metadata } from "next";

import LegalPage from "@/app/en/components/legal-page";
import { TERMS } from "@/lib/en/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Solver AI WordPress Builder terms of service. Review the terms and responsibilities that apply while using the service.",
  alternates: { canonical: "/en/legal/terms" },
};

export default function Page() {
  return <LegalPage content={TERMS} />;
}
