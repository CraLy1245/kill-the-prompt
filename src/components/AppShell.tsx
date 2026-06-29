"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ModelSettingsButton } from "@/components/ModelSettingsDialog";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";

export function AppShell({
  children,
  variant = "flow",
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  variant?: "home" | "flow";
  className?: string;
  contentClassName?: string;
}) {
  const hydrate = useLogoFlowStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const defaultContentClassName =
    variant === "home"
      ? "mx-auto grid min-h-[calc(100dvh-64px)] w-[min(100%-32px,960px)] place-items-center px-0 py-12 md:py-16"
      : "mx-auto w-[min(100%-40px,1180px)] px-0 py-8 md:py-10";

  return (
    <div className={className ?? "relative min-h-screen bg-paper text-ink"}>
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,248,252,0.86)),linear-gradient(rgba(20,24,35,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,24,35,0.045)_1px,transparent_1px)] bg-[size:100%_100%,42px_42px,42px_42px]"
        aria-hidden="true"
      />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#141823]/[0.06] bg-white/65 px-5 backdrop-blur-xl md:px-12">
        <Link className="flex min-w-0 items-center" href="/" aria-label="返回首页">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#003b73]/10 bg-white shadow-[0_10px_24px_rgba(0,59,115,0.14)]">
            <img src="/brand/jixiao-logo.png" alt="" className="h-10 w-10 object-contain" />
          </span>
        </Link>

        <nav className="flex items-center gap-3" aria-label="页面导航">
          <ModelSettingsButton />
          <Link
            className="hidden min-h-10 items-center rounded-full border border-[#141823]/10 bg-white/65 px-4 text-sm text-muted transition hover:border-accent/30 hover:bg-white hover:text-ink sm:inline-flex"
            href="/"
          >
            Logo 设计
          </Link>
          <span className="hidden min-h-10 items-center rounded-full border border-[#141823]/10 bg-white/65 px-4 text-sm text-muted sm:inline-flex">
            状态
          </span>
          <button
            className="inline-grid h-10 w-10 place-items-center rounded-full border border-[#141823]/10 bg-white/65 text-muted transition hover:bg-white sm:hidden"
            type="button"
            aria-label="打开菜单"
          >
            <Menu size={18} />
          </button>
        </nav>
      </header>

      <main className={contentClassName ?? defaultContentClassName}>{children}</main>
    </div>
  );
}
