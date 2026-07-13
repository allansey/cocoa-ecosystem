export default function Loading() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30 flex items-center justify-center animate-pulse">
        <span className="text-white font-black text-xl leading-none">C</span>
      </div>
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{animationDelay: '0ms'}}></div>
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{animationDelay: '150ms'}}></div>
        <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce" style={{animationDelay: '300ms'}}></div>
      </div>
    </div>
  );
}
