"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ModelSettingsButton } from "@/components/ModelSettingsDialog";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";

export function AppShell({ children, variant = "flow", className, contentClassName }: { children: React.ReactNode; variant?: "home" | "flow"; className?: string; contentClassName?: string }) {
  const hydrate = useLogoFlowStore((state) => state.hydrate);

  useEffect(() => { hydrate(); }, [hydrate]);

  const isHome = variant === "home";
  const defaultContentClassName = isHome ? "w-full" : "mx-auto w-[min(100%-40px,1180px)] px-0 py-8 md:py-10";

  return (
    <div className={className ?? (isHome ? "relative min-h-screen bg-paper text-ink" : "relative min-h-screen bg-paper text-ink")}>
      {!isHome ? <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,248,252,0.86)),linear-gradient(rgba(20,24,35,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,24,35,0.045)_1px,transparent_1px)] bg-[size:100%_100%,42px_42px,42px_42px]" aria-hidden="true" /> : null}
      <header className={isHome ? "relative z-30 flex h-[58px] items-center justify-between border-b border-white/70 bg-[linear-gradient(90deg,rgba(225,241,236,0.68),rgba(255,255,255,0.5),rgba(225,241,236,0.62))] px-6 shadow-[0_8px_30px_rgba(35,67,62,0.06)] backdrop-blur-2xl md:px-10" : "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#141823]/[0.06] bg-white/65 px-5 backdrop-blur-xl md:px-12"}>
        <Link className="flex min-w-0 items-center gap-2.5" href="/" aria-label="返回首页">
          <span className={`${isHome ? "h-8 w-8 rounded-[10px]" : "h-10 w-10 rounded-xl"} grid shrink-0 place-items-center overflow-hidden border border-[#003b73]/10 bg-white shadow-[0_8px_20px_rgba(0,59,115,0.12)]`}><img src="/brand/jixiao-logo.png" alt="" className="h-full w-full object-contain" /></span>
          {isHome ? <span className="text-[19px] font-semibold tracking-[-0.05em] text-ink">Stepic</span> : null}
        </Link>
        <nav className={isHome ? "flex items-center gap-0 rounded-full border border-line/80 bg-white/80 p-1 shadow-sm backdrop-blur-md" : "flex items-center gap-3"} aria-label="页面导航">
          <ModelSettingsButton variant={isHome ? "home" : "default"} />
          {isHome ? <><span className="mx-1 h-4 w-px bg-line" /><Link className="flex items-center rounded-full bg-accentSoft px-4 py-2 text-sm font-medium text-accent" href="/">开始设计</Link><span className="mx-1 h-4 w-px bg-line" /><span className="flex items-center rounded-full px-4 py-2 text-sm font-medium text-muted">状态</span></> : <><Link className="hidden min-h-10 items-center rounded-full border border-[#141823]/10 bg-white/65 px-4 text-sm text-muted transition hover:border-accent/30 hover:bg-white hover:text-ink sm:inline-flex" href="/">Logo 设计</Link><span className="hidden min-h-10 items-center rounded-full border border-[#141823]/10 bg-white/65 px-4 text-sm text-muted sm:inline-flex">状态</span></>}
          {!isHome ? <button className="inline-grid h-10 w-10 place-items-center rounded-full border border-[#141823]/10 bg-white/65 text-muted transition hover:bg-white sm:hidden" type="button" aria-label="打开菜单"><Menu size={18} /></button> : null}
        </nav>
      </header>
      <main className={contentClassName ?? defaultContentClassName}>{children}</main>
    </div>
  );
}
