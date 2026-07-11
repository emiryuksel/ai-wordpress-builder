import type { Metadata } from "next";

const siteName = "Solver AI WordPress Builder";
const siteDescription =
  "Build, edit and publish WordPress sites in minutes just by chatting with AI, using Solver AI WordPress Builder. SEO-ready, fast and modern websites.";
const siteUrl = "https://withsolver.com";

export const metadata: Metadata = {
  title: {
    absolute: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "Solver",
    "AI WordPress Builder",
    "AI WordPress",
    "WordPress site builder",
    "AI website",
    "AI website builder",
    "WordPress builder",
    "SEO-friendly website",
  ],
  alternates: {
    canonical: "/en",
    languages: {
      tr: "/",
      en: "/en",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${siteUrl}/en`,
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
};

export default function EnLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
