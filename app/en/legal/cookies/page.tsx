import type { Metadata } from "next";

import LegalPage from "@/app/en/components/legal-page";
import { COOKIES } from "@/lib/en/legal-content";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Solver AI WordPress Builder cookie policy. Learn how we use cookies and similar technologies.",
  alternates: { canonical: "/en/legal/cookies" },
};

export default function Page() {
  return <LegalPage content={COOKIES} />;
}
