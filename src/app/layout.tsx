import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "让提示词去死 · 通用创作工作台",
  description: "说出想法，做出选择，剩下的交给 AI。把模糊需求转成图片、文章、网页和产品功能。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
