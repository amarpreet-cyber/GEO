export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="h-12 bg-white border-b border-slate-200 flex items-center px-6">
        <span className="flex h-7 items-center rounded-md px-2 bg-[#1F1F1F]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/risa-logo-white.png" alt="RISA" className="h-3.5 w-auto" />
        </span>
        <span className="ml-2 text-[12px] font-semibold text-slate-400 tracking-tight">GEO Setup</span>
      </header>
      <main className="flex-1 flex items-start justify-center py-16 px-4">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
