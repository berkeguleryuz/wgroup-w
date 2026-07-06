"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Link } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

gsap.registerPlugin(useGSAP);

import type { MarketingUser } from "@/components/marketing/MarketingHeader";

export function MobileMenu({ user }: { user?: MarketingUser | null }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  // The overlay is portaled to <body>: the header pill uses backdrop-blur,
  // which makes it the containing block for fixed descendants and would trap
  // the "fullscreen" panel inside the pill.
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => setMounted(true), []);

  const links = [
    { href: "/#library", label: t("nav.library") },
    { href: "/business", label: t("nav.business") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/#faq", label: t("nav.faq") },
  ];

  useGSAP(
    () => {
      if (!overlayRef.current) return;

      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.inOut" },
      });

      tl.set(overlayRef.current, { autoAlpha: 1 })
        .fromTo(
          overlayRef.current,
          { clipPath: "inset(0% 0% 100% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6 },
        )
        .fromTo(
          ".mm-rule",
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.5,
            stagger: 0.06,
            transformOrigin: "left center",
            ease: "power2.out",
          },
          "-=0.25",
        )
        .fromTo(
          ".mm-link",
          { yPercent: 120, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.07,
            ease: "power3.out",
          },
          "<",
        )
        .fromTo(
          ".mm-footer",
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
          "-=0.3",
        );

      tlRef.current = tl;
    },
    { dependencies: [mounted], scope: overlayRef, revertOnUpdate: true },
  );

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    if (open) {
      tl.timeScale(1).play();
      document.body.style.overflow = "hidden";
    } else {
      tl.timeScale(1.6).reverse();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const overlay = (
    <div
      ref={overlayRef}
      // z-30 keeps the panel under the fixed z-40 header pill, so the
      // hamburger (now an X) stays visible and clickable while the menu is open.
      className="invisible fixed inset-0 z-30 flex flex-col opacity-0 md:hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 70% 20%, #2b2016 0%, #14100a 55%, #0b0906 100%)",
      }}
      aria-hidden={!open}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 30%, black 40%, transparent 100%)",
        }}
      />

      <nav className="relative flex flex-1 flex-col justify-center px-6 pt-20">
        <p className="font-accent mb-4 text-sm tracking-wide text-[#edddb9]/70">
          {t("hero.sideLabel")}
        </p>
        <ul>
          {links.map((link, i) => (
            <li key={link.href} className="overflow-hidden">
              <span className="mm-rule block h-px w-full bg-[#edddb9]/20" />
              <div className="overflow-hidden py-1">
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="mm-link flex items-baseline gap-4 py-3"
                >
                  <span className="font-mono text-xs text-[#edddb9]/50">
                    0{i + 1}
                  </span>
                  <span className="font-display text-4xl leading-tight text-[#f3e9d0]">
                    {link.label}
                  </span>
                </Link>
              </div>
            </li>
          ))}
          <li>
            <span className="mm-rule block h-px w-full bg-[#edddb9]/20" />
          </li>
        </ul>
      </nav>

      <div className="mm-footer relative flex flex-col gap-3 px-6 pb-8">
        <div className="flex items-center justify-between">
          {user ? (
            <span className="flex items-center gap-2 text-sm font-semibold text-[#f3e9d0]">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#edddb9] font-display text-xs text-[#0b0906]">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="max-w-[160px] truncate">{user.name}</span>
            </span>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-[#f3e9d0] underline-offset-4 hover:underline"
            >
              {t("common.login")}
            </Link>
          )}
          <LocaleSwitcher />
        </div>
        <Link
          href={user ? "/app" : "/register"}
          onClick={() => setOpen(false)}
          className="inline-flex h-12 items-center justify-center rounded-11 bg-[#edddb9] px-4 text-sm font-semibold text-[#0b0906]"
        >
          {user ? t("common.goToApp") : t("common.getStarted")}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("common.cancel") : "Menu"}
        aria-expanded={open}
        className="relative z-[60] inline-flex h-9 w-9 items-center justify-center rounded-11 border border-border/60 bg-background/95"
      >
        <span className="relative block h-3.5 w-4.5">
          <span
            className="absolute left-0 top-0 block h-[1.5px] w-full rounded-full bg-foreground transition-all duration-300"
            style={{
              transform: open
                ? "translateY(6px) rotate(45deg)"
                : "translateY(0) rotate(0)",
            }}
          />
          <span
            className="absolute left-0 top-1/2 block h-[1.5px] w-full -translate-y-1/2 rounded-full bg-foreground transition-all duration-300"
            style={{ opacity: open ? 0 : 1 }}
          />
          <span
            className="absolute bottom-0 left-0 block h-[1.5px] w-full rounded-full bg-foreground transition-all duration-300"
            style={{
              transform: open
                ? "translateY(-6px) rotate(-45deg)"
                : "translateY(0) rotate(0)",
            }}
          />
        </span>
      </button>

      {mounted && createPortal(overlay, document.body)}
    </div>
  );
}
