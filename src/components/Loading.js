export function Spinner({ size = 8 }) {
  return <div className={`w-${size} h-${size} border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin`} />;
}
export function LoadingCard() {
  return <div className="flex items-center justify-center p-8"><Spinner /></div>;
}
export function ErrorMsg({ message }) {
  return <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">⚠️ {message}</div>;
}
