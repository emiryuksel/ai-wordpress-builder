import type { Metadata } from "next";

import LegalPage from "@/app/components/legal-page";
import { KVKK } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description:
    "Solver AI WordPress Builder KVKK aydınlatma metni. 6698 sayılı Kanun kapsamında kişisel verilerinizin işlenmesine ilişkin bilgilendirme.",
  alternates: { canonical: "/legal/kvkk" },
};

export default function Page() {
  return <LegalPage content={KVKK} />;
}
