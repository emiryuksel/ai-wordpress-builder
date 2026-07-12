import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LocaleTransition from "@/app/components/locale-transition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "Solver AI WordPress Builder";
const siteDescription =
  "Solver AI WordPress Builder ile yapay zekaya konuşarak WordPress siteleri oluşturun, düzenleyin ve dakikalar içinde yayınlayın. SEO'ya hazır, hızlı ve modern web siteleri.";
const siteUrl = "https://withsolver.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "Solver",
    "AI WordPress Builder",
    "yapay zeka WordPress",
    "WordPress site oluşturucu",
    "yapay zeka web sitesi",
    "AI website builder",
    "WordPress builder",
    "SEO uyumlu web sitesi",
  ],
  authors: [{ name: "Solver", url: siteUrl }],
  creator: "Solver",
  publisher: "Solver",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body
        className="flex min-h-screen flex-col"
        suppressHydrationWarning
      >
        <LocaleTransition>{children}</LocaleTransition>
      </body>
    </html>
  );
}
