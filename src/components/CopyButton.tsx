"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(0,59,115,0.2)] transition hover:-translate-y-0.5 hover:bg-[#002f5c]"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}
