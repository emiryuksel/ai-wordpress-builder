"use client";

import Image from "next/image";

type Feature = {
  icon: string;
  badge: string;
  title: string;
  description: string;
};

type Step = {
  no: string;
  title: string;
  description: string;
  hint: string;
};

const FEATURES: Feature[] = [
  {
    icon: "M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 1 1-3.5-7.1L21 3v6h-6",
    badge: "CHAT",
    title: "Just say it, and it's built",
    description:
      "No coding required. Describe your business, goals and wishes. The AI designs and generates your WordPress site from scratch.",
  },
  {
    icon: "M13 2 3 14h7l-1 8 10-12h-7l1-8z",
    badge: "AI",
    title: "Smart editing",
    description:
      "\"Make the hero warmer\", \"update the prices\", \"add a gallery\". Type what you want and the AI knows exactly what to change in WordPress.",
  },
  {
    icon: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    badge: "PREVIEW",
    title: "See it instantly",
    description:
      "Every change appears instantly in your live WordPress preview. No need to refresh the page to see what you did.",
  },
  {
    icon: "M4 7h16M4 12h16M4 17h10",
    badge: "QUALITY",
    title: "Real, working WordPress sites",
    description:
      "The generated sites are real WordPress installs. They work flawlessly on desktop, tablet and mobile and arrive ready to publish.",
  },
  {
    icon: "M4 5h16v14H4z M4 15l4-4 3 3 5-5 4 4",
    badge: "MEDIA",
    title: "Images generated automatically",
    description:
      "Whenever your site needs an image, the AI notices it and generates original visuals tailored to your content and places them in WordPress.",
  },
  {
    icon: "M12 2v6m0 8v6m10-10h-6M8 12H2",
    badge: "SPEED",
    title: "Ready in minutes",
    description:
      "WordPress setups that used to take weeks now take minutes. Edit whenever you want, share whenever you want.",
  },
];

const STEPS: Step[] = [
  {
    no: "01",
    title: "Create your account",
    description:
      "Sign up in seconds with your email and password. No credit card required, you can start right away.",
    hint: "No paid plan required",
  },
  {
    no: "02",
    title: "Describe your site",
    description:
      "Write about your business, your goals and the kind of site you want. The AI analyzes your request and moves to the right WordPress structure.",
    hint: "Guiding examples available",
  },
  {
    no: "03",
    title: "The AI generates your site",
    description:
      "WordPress is installed, content is created and the theme is configured. AI images are generated automatically wherever visuals are needed.",
    hint: "Content and images together",
  },
  {
    no: "04",
    title: "Preview and edit by chatting",
    description:
      "The generated WordPress site appears in your browser instantly. Pick the section you want and type your edit request, and the AI makes a surgical change.",
    hint: "Instant, targeted editing",
  },
  {
    no: "05",
    title: "Share",
    description:
      "Your site is published publicly with a unique address. It can be visited without an account and shared instantly.",
    hint: "Live with one click",
  },
];

const BRANDS = [
  "İstanbul Şömine",
  "Vakaffes",
  "Nfree",
  "Espasio Cosmetic",
  "Gochre Aktos",
  "Studio Plus",
  "Deka Yapı",
];

function SectionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#6c5ce7]/20 bg-[#6c5ce7]/10 px-3 py-1 text-xs font-medium tracking-wide text-[#5847e0]">
      {label}
    </span>
  );
}

export default function LandingSections() {
  return (
    <div className="w-full">
      {/* Trusted brands + stats */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
          Trusted by
        </p>
        <div className="mb-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="text-sm font-medium text-zinc-400 transition hover:text-zinc-600"
            >
              {brand}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: "150+", label: "Completed projects", sub: "and growing" },
            { value: "15+", label: "Expert team members", sub: "always by your side" },
            { value: "98%", label: "Customer satisfaction", sub: "average score" },
            { value: "∞", label: "Delivered in minutes", sub: "vs. manual WordPress setup" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-[#1d1d1f]">
                {stat.label}
              </p>
              <p className="text-xs text-zinc-400">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-14 text-center">
          <SectionBadge label="✦ PLATFORM FEATURES" />
          <h2 className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
            A real AI system,{" "}
            <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
              designed from scratch.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            Chat, generation, editing and memory. Every layer was built
            specifically for WordPress generation. No complex setup, no limits.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="glass group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-24px_rgba(30,27,75,0.4)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-[#5847e0] shadow-sm">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d={feature.icon} />
                  </svg>
                </span>
                <span className="rounded-full bg-[#6c5ce7]/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#5847e0]">
                  {feature.badge}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works steps */}
      <section id="how-it-works" className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <div className="mb-14 text-center">
          <SectionBadge label="✦ SIMPLE WORKFLOW" />
          <h2 className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
            Write, generate, share.{" "}
            <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
              It&apos;s that simple.
            </span>
          </h2>
        </div>

        <ol className="relative space-y-8 border-l border-[#6c5ce7]/20 pl-8">
          {STEPS.map((step) => (
            <li key={step.no} className="relative">
              <span className="absolute -left-[2.6rem] flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-xs font-bold text-white shadow-[0_6px_16px_-6px_rgba(88,71,224,0.6)]">
                {step.no}
              </span>
              <h3 className="text-base font-semibold text-[#1d1d1f]">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                {step.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#6c5ce7]/20 bg-[#6c5ce7]/5 px-3 py-1 text-xs font-medium text-[#5847e0]">
                ✦ {step.hint}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Live preview macOS mockup */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <div className="mb-12 text-center">
          <SectionBadge label="✦ LIVE PLATFORM PREVIEW" />
          <h2 className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
            Chat, watch,{" "}
            <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
              share.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            The AI takes your request, applies it on WordPress and shows the
            result in your browser instantly. Same screen, same moment.
          </p>
        </div>

        <div className="glass-strong overflow-hidden rounded-[24px] shadow-[0_40px_100px_-30px_rgba(30,27,75,0.5)]">
          {/* Window title bar */}
          <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <p className="ml-2 truncate text-xs font-medium text-zinc-500">
              WordPress Builder Workspace
            </p>
          </div>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-[280px_1fr]">
            {/* Left: chat panel */}
            <div className="space-y-3 border-r border-white/30 bg-white/40 p-4">
              <p className="text-xs font-semibold text-[#5847e0]">Solver AI</p>
              {[
                "Build a WordPress site for a new online store",
                "The hero text is ready, would you like to edit it?",
                "Add Hero, About and Gallery sections",
                "Editing your WordPress site now, one moment...",
                "Updated to \"Fresh products every morning\", much clearer now.",
              ].map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                    i % 2 === 0
                      ? "bg-white/70 text-zinc-600"
                      : "ml-4 bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] text-white"
                  }`}
                >
                  {msg}
                </div>
              ))}
            </div>

            {/* Right: live site preview */}
            <div className="bg-white/30 p-4 sm:p-6">
              <div className="overflow-hidden rounded-xl border border-white/60 bg-white shadow-[0_20px_50px_-24px_rgba(30,27,75,0.45)]">
                <Image
                  src="/image-site-wp.png"
                  alt="Preview of an example WordPress site built with Solver AI"
                  width={1920}
                  height={995}
                  className="h-auto w-full"
                  sizes="(max-width: 768px) 100vw, 700px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <SectionBadge label="✦ PRICING" />
        <h2 className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight tracking-tight text-[#1d1d1f]">
          Pricing tailored{" "}
          <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
            to your project.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
          Every project is different. Let&apos;s talk about your needs and pick
          the plan that fits you best together.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#hero"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6]"
          >
            Get started →
          </a>
          <a
            href="#contact"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white/60 px-6 text-sm font-medium text-zinc-700 backdrop-blur-sm transition hover:bg-white/80"
          >
            Get in touch
          </a>
        </div>
        <p className="mt-6 text-xs text-zinc-400">
          ✦ No credit card required · Free discovery call
        </p>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
        <SectionBadge label="✦ Start working with the Solver team" />
        <h2 className="mt-6 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-[#1d1d1f]">
          Your next website is
          <br />
          just a conversation away.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-zinc-500 sm:text-base">
          Stop spending weeks. Just describe what you need and build a beautiful
          WordPress site in minutes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#hero"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#7b6cf0] to-[#5847e0] px-7 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,71,224,0.6)] transition hover:from-[#8577f2] hover:to-[#6353e6]"
          >
            Start building for free →
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white/60 px-7 text-sm font-medium text-zinc-700 backdrop-blur-sm transition hover:bg-white/80"
          >
            See how it works
          </a>
        </div>
        <p className="mt-6 text-xs text-zinc-400">
          No credit card required · Cancel anytime
        </p>
      </section>
    </div>
  );
}
