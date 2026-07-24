"use client";

import { FolderOpen, Home, Info, Library, Menu, Settings2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ModelSettingsButton } from "@/components/ModelSettingsDialog";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";

const legacyLinks = [
  { href: "/", label: "首页", icon: Home },
  { href: "/projects", label: "项目", icon: FolderOpen },
  { href: "/packs", label: "创作包", icon: Library },
  { href: "/settings", label: "设置", icon: Settings2 },
  { href: "/about", label: "关于", icon: Info },
] as const;

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
  const pathname = usePathname();
  const hydrate = useLogoFlowStore((state) => state.hydrate);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const defaultContentClassName =
    variant === "home"
      ? "mx-auto grid min-h-[calc(100dvh-72px)] w-[min(100%-32px,1040px)] place-items-center px-0 py-12 md:py-16"
      : "mx-auto w-[min(100%-40px,1240px)] px-0 py-8 md:py-12";

  return (
    <div className={className ?? "stepic-shell relative min-h-screen bg-paper text-ink"} data-route={pathname}>
      <a className="stepic-skip-link" href="#legacy-main">跳到主要内容</a>
      <div className="stepic-ambient" aria-hidden="true" />

      <header className="stepic-global-header">
        <Link className="stepic-global-brand" href="/" aria-label="让提示词去死首页">
          <span aria-hidden="true"><Sparkles size={18} /></span>
          <strong>让提示词去死</strong>
          <small>LEGACY LOGO FLOW</small>
        </Link>

        <nav className="stepic-global-nav" aria-label="全局导航">
          {legacyLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href || (href !== "/" && pathname.startsWith(href)) ? "active" : ""}>
              <Icon size={15} />{label}
            </Link>
          ))}
          <ModelSettingsButton />
        </nav>

        <button className="stepic-menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "关闭菜单" : "打开菜单"} aria-expanded={menuOpen}>
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </header>

      {menuOpen ? (
        <nav className="stepic-mobile-nav" aria-label="移动端全局导航">
          {legacyLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}><Icon size={17} />{label}</Link>
          ))}
          <ModelSettingsButton />
        </nav>
      ) : null}

      <main id="legacy-main" className={contentClassName ?? defaultContentClassName}>{children}</main>
    </div>
  );
}
