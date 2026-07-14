"use client";

import { Check } from "lucide-react";
import Link from "next/link";

const steps = ["输入需求", "理解确认", "选择方向", "收敛细节", "方案确认", "生成 Logo"];
const routes = ["/", "/understanding", "/directions", "/details", "/plan", "/result"];

export function StepNav({ current }: { current: number }) {
  const currentStep = steps[current] ?? steps[0];

  return (
    <nav className="mx-auto mb-4 w-full rounded-[22px] border border-[#141823]/10 bg-white/70 px-4 py-3 text-sm text-muted backdrop-blur-xl" aria-label="流程进度">
      <div className="flex items-center justify-between gap-4 sm:hidden">
        <div>
          <div className="text-xs font-semibold text-accent">
            第 {current + 1} / {steps.length} 步
          </div>
          <div className="mt-0.5 text-base font-semibold text-ink">{currentStep}</div>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {steps.map((step, index) => (
            <span key={step} className={index <= current ? "h-2 w-6 rounded-full bg-accent" : "h-2 w-2 rounded-full bg-[#141823]/10"} />
          ))}
        </div>
      </div>

      <div className="hidden items-center justify-center gap-2 sm:flex">
        {steps.map((step, index) => {
          const active = index === current;
          const done = index < current;

          const indicatorClass = [
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold transition",
            active
              ? "border-transparent bg-accent text-white"
              : done
                ? "border-accent/20 bg-accentSoft text-accent"
                : "border-[#141823]/10 bg-white/70",
          ].join(" ");

          const indicator = <span className={indicatorClass}>{done ? <Check size={16} /> : index + 1}</span>;
          const labelClass = active ? "whitespace-nowrap font-semibold text-ink" : "whitespace-nowrap";
          const connector = index < steps.length - 1 ? <span className="mx-2 h-px w-10 shrink-0 bg-[#141823]/10" /> : null;

          // 已完成步骤可点击回退;当前步标记 aria-current;未来步禁用。
          if (done) {
            return (
              <div key={step} className="flex items-center gap-2">
                <Link
                  href={routes[index]}
                  className="group flex items-center gap-2 rounded-2xl transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  aria-label={`返回「${step}」`}
                >
                  <span className={indicatorClass}>
                    <Check size={16} />
                  </span>
                  <span className={`${labelClass} group-hover:text-ink`}>{step}</span>
                </Link>
                {connector}
              </div>
            );
          }

          return (
            <div key={step} className="flex items-center gap-2">
              <div className={active ? "flex items-center gap-2" : "flex items-center gap-2 cursor-not-allowed opacity-60"} aria-current={active ? "step" : undefined}>
                {indicator}
                <span className={labelClass}>{step}</span>
              </div>
              {connector}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
