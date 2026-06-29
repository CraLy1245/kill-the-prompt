import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Logo Decision Funnel",
  description: "用漏斗筛选逻辑把模糊 Logo 需求收敛为可执行 AI 设计方案。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
