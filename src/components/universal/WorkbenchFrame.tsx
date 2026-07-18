"use client";

import {
  FolderOpen,
  Image as ImageIcon,
  Library,
  Menu,
  Monitor,
  PanelsTopLeft,
  PenLine,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { ArtifactKind } from "@/types/universal";

const creationLinks = [
  { href: "/?kind=image", label: "图片", icon: ImageIcon, kind: "image" },
  { href: "/?kind=writing", label: "写作", icon: PenLine, kind: "writing" },
  { href: "/?kind=web-page", label: "网页", icon: Monitor, kind: "web-page" },
  { href: "/?kind=product-feature", label: "功能设计", icon: PanelsTopLeft, kind: "product-feature" },
] as const;

const utilityLinks = [
  { href: "/projects", label: "项目", icon: FolderOpen, current: "projects" },
  { href: "/packs", label: "创作包", icon: Library, current: "packs" },
  { href: "/settings", label: "设置", icon: Settings2, current: "settings" },
] as const;

export function WorkbenchFrame({ children, current }: { children: ReactNode; current?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string, currentId?: string) {
    if (currentId && current === currentId) return true;
    if (href === "/projects") return pathname.startsWith("/projects") || (pathname.startsWith("/workspace") && !creationLinks.some((item) => item.kind === current));
    if (href === "/packs") return pathname.startsWith("/packs");
    if (href === "/settings") return pathname.startsWith("/settings");
    return false;
  }

  const navigation = (
    <>
      <Link href="/" className="uc-sidebar-brand" onClick={() => setMenuOpen(false)}>
        <strong>让提示词去死</strong>
        <span>说出想法，做出选择，剩下的交给 AI</span>
      </Link>

      <nav className="uc-sidebar-creation" aria-label="成果类型">
        {creationLinks.map(({ href, label, icon: Icon, kind }) => (
          <Link key={kind} href={href} className={current === kind ? "active" : ""} onClick={() => setMenuOpen(false)}>
            <Icon size={21} strokeWidth={1.7} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <nav className="uc-sidebar-utility" aria-label="工作区导航">
        {utilityLinks.map(({ href, label, icon: Icon, current: currentId }) => (
          <Link
            key={href}
            href={href}
            className={isActive(href, currentId) ? "active" : ""}
            onClick={() => setMenuOpen(false)}
          >
            <Icon size={18} strokeWidth={1.7} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <Link href="/create" className="uc-sidebar-create" onClick={() => setMenuOpen(false)}>
        <Plus size={18} />
        新建项目
      </Link>
    </>
  );

  return (
    <div className="uc-app-shell">
      <aside className="uc-sidebar">{navigation}</aside>

      <header className="uc-mobile-header">
        <Link href="/" className="uc-mobile-brand">让提示词去死</Link>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="打开导航菜单">
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

      <main className="uc-app-main">{children}</main>
    </div>
  );
}

export function ArtifactIcon({ kind }: { kind: ArtifactKind }) {
  const Icon = kind === "image" ? ImageIcon : kind === "writing" ? PenLine : kind === "web-page" ? Monitor : PanelsTopLeft;
  return <span className={`uc-kind-icon uc-kind-${kind}`} aria-hidden="true"><Icon size={16} strokeWidth={1.8} /></span>;
}
