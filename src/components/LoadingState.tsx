export function LoadingState({ label = "正在生成..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#141823]/10 bg-white/75 px-4 py-3 text-sm text-muted shadow-[0_10px_40px_rgba(24,33,66,0.055)] backdrop-blur-xl">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
      {label}
    </div>
  );
}
