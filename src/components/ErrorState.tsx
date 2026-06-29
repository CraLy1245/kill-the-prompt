export function ErrorState({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-[0_10px_40px_rgba(24,33,66,0.055)]">{message}</div>;
}
