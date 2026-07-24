"use client";

import {
  FolderOpen,
  Image as ImageIcon,
  Info,
  Library,
  Menu,
  Monitor,
  PanelsTopLeft,
  PenLine,
  Plus,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { ArtifactKind } from "@/types/universal";

const creationLinks = [
  { href: "/?kind=image", label: "图片", icon: ImageIcon, kind: "image", hint: "视觉与图像" },
  { href: "/?kind=writing", label: "写作", icon: PenLine, kind: "writing", hint: "文章与文案" },
  { href: "/?kind=web-page", label: "网页", icon: Monitor, kind: "web-page", hint: "页面与界面" },
  { href: "/?kind=product-feature", label: "功能设计", icon: PanelsTopLeft, kind: "product-feature", hint: "流程与产品" },
] as const;

const utilityLinks = [
  { href: "/projects", label: "项目", icon: FolderOpen, current: "projects" },
  { href: "/packs", label: "创作包", icon: Library, current: "packs" },
  { href: "/settings", label: "模型设置", icon: Settings2, current: "settings" },
  { href: "/about", label: "关于", icon: Info, current: "about" },
] as const;

export function WorkbenchFrame({ children, current }: { children: ReactNode; current?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  function isActive(href: string, currentId?: string) {
    if (currentId && current === currentId) return true;
    if (href === "/projects") return pathname.startsWith("/projects") || (pathname.startsWith("/workspace") && !creationLinks.some((item) => item.kind === current));
    if (href === "/packs") return pathname.startsWith("/packs");
    if (href === "/settings") return pathname.startsWith("/settings");
    if (href === "/about") return pathname.startsWith("/about");
    return false;
  }

  const navigation = (
    <>
      <Link href="/" className="uc-sidebar-brand" onClick={() => setMenuOpen(false)} aria-label="让提示词去死首页">
        <span className="uc-sidebar-brand-mark" aria-hidden="true">✦</span>
        <span className="uc-sidebar-brand-copy">
          <strong>让提示词去死</strong>
          <small>UNIVERSAL CREATION OS</small>
        </span>
      </Link>

      <div className="uc-sidebar-section-label">创作类型</div>
      <nav className="uc-sidebar-creation" aria-label="成果类型">
        {creationLinks.map(({ href, label, icon: Icon, kind, hint }) => {
          const active = current === kind;
          return (
            <Link key={kind} href={href} className={active ? "active" : ""} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined}>
              <Icon size={20} strokeWidth={1.7} />
              <span><strong>{label}</strong><small>{hint}</small></span>
            </Link>
          );
        })}
      </nav>

      <div className="uc-sidebar-section-label utility">工作台</div>
      <nav className="uc-sidebar-utility" aria-label="工作区导航">
        {utilityLinks.map(({ href, label, icon: Icon, current: currentId }) => {
          const active = isActive(href, currentId);
          return (
            <Link key={href} href={href} className={active ? "active" : ""} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="uc-sidebar-status">
        <ShieldCheck size={17} strokeWidth={1.8} />
        <span><strong>本地优先</strong><small>项目与密钥留在本机</small></span>
      </div>

      <Link href="/create" className="uc-sidebar-create" onClick={() => setMenuOpen(false)}>
        <Plus size={18} />
        新建项目
      </Link>
    </>
  );

  return (
    <div className="uc-app-shell" data-route={pathname} data-current={current ?? "none"}>
      <a className="uc-skip-link" href="#main-content">跳到主要内容</a>
      <aside className="uc-sidebar">{navigation}</aside>

      <header className="uc-mobile-header">
        <Link href="/" className="uc-mobile-brand" aria-label="返回首页"><span aria-hidden="true">✦</span>让提示词去死</Link>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="打开导航菜单" aria-expanded={menuOpen}>
          <Menu size={21} />
        </button>
      </header>

      {menuOpen ? (
        <div className="uc-mobile-overlay" role="presentation" onClick={() => setMenuOpen(false)}>
          <aside className="uc-mobile-drawer" role="dialog" aria-modal="true" aria-label="导航菜单" onClick={(event) => event.stopPropagation()}>
            <button className="uc-mobile-close" type="button" onClick={() => setMenuOpen(false)} aria-label="关闭导航菜单">
              <X size={20} />
            </button>
            {navigation}
          </aside>
        </div>
      ) : null}

      <main id="main-content" className="uc-app-main">{children}</main>
    </div>
  );
}

export function ArtifactIcon({ kind }: { kind: ArtifactKind }) {
  const Icon = kind === "image" ? ImageIcon : kind === "writing" ? PenLine : kind === "web-page" ? Monitor : PanelsTopLeft;
  return <span className={`uc-kind-icon uc-kind-${kind}`} aria-hidden="true"><Icon size={16} strokeWidth={1.8} /></span>;
}
