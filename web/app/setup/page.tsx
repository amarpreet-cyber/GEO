"use client";
// Setup wizard — 2 steps: Keywords → Competitors → Start
// Brand is pre-fixed to RISA Labs (internal tool).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Plus, X, Loader2, Zap, TrendingUp } from "lucide-react";

// ── defaults ─────────────────────────────────────────────────────────────────

const BRAND = {
  name: "RISA Labs",
  domain: "risalabs.ai",
  aliases: ["RISA", "RISA AI", "RISA Labs AI"],
};

const DEFAULT_KEYWORDS = [
  { id: "prior-auth", label: "Prior Authorization", category: "core" },
  { id: "claim-denial", label: "Claim Denials", category: "core" },
  { id: "revenue-cycle", label: "Revenue Cycle Management", category: "core" },
  { id: "payer-policy", label: "Payer Policy Alignment", category: "core" },
  { id: "patient-access", label: "Patient Access & Therapy Start", category: "clinical" },
  { id: "oncology-billing", label: "Oncology Billing", category: "clinical" },
  { id: "rcm-automation", label: "RCM Automation", category: "tech" },
  { id: "ai-healthcare", label: "AI in Healthcare Operations", category: "tech" },
  { id: "buy-and-bill", label: "Buy-and-Bill Workflows", category: "core" },
  { id: "eob-underpayment", label: "EOB / Underpayment Detection", category: "core" },
  { id: "auth-to-cash", label: "Auth-to-Cash Gap", category: "core" },
  { id: "fte-reduction", label: "Staff / FTE Reduction", category: "core" },
];

const DEFAULT_COMPETITORS = [
  { id: "cohere-health", name: "Cohere Health", domain: "coherehealth.com", category: "PA Automation", side: "direct" },
  { id: "flatiron", name: "Flatiron Health", domain: "flatiron.com", category: "Oncology Tech", side: "adjacent" },
  { id: "availity", name: "Availity", domain: "availity.com", category: "Payer Connectivity", side: "adjacent" },
  { id: "waystar", name: "Waystar", domain: "waystar.com", category: "RCM Platform", side: "adjacent" },
  { id: "myndshft", name: "Myndshft", domain: "myndshft.com", category: "PA Automation", side: "direct" },
  { id: "rhyme", name: "Rhyme", domain: "rhyme.com", category: "PA Automation", side: "direct" },
  { id: "covermymeds", name: "CoverMyMeds", domain: "covermymeds.com", category: "PA Automation", side: "direct" },
  { id: "humata", name: "Humata Health", domain: "humatahealth.com", category: "PA Automation", side: "direct" },
  { id: "akasa", name: "AKASA", domain: "akasa.com", category: "RCM AI", side: "adjacent" },
  { id: "imagine", name: "ImagineSoftware", domain: "imaginesoftware.com", category: "Oncology Billing", side: "adjacent" },
  { id: "ascertain", name: "Ascertain", domain: "ascertain.io", category: "PA Automation", side: "direct" },
  { id: "infinitus", name: "Infinitus Systems", domain: "infinitusai.com", category: "PA Automation", side: "direct" },
];

const CAT_COLORS: Record<string, string> = {
  core: "#0056D6", clinical: "#059669", tech: "#7c3aed",
  "PA Automation": "#0056D6", "Oncology Tech": "#059669", "RCM Platform": "#CA8A04",
  "Payer Connectivity": "#5C5C5C", "RCM AI": "#7c3aed", "Oncology Billing": "#059669",
};

type Keyword = { id: string; label: string; category: string };
type Competitor = { id: string; name: string; domain: string; category: string; side: string };

// ── UI atoms ──────────────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${i < step ? "bg-[#0056D6]" : "bg-slate-200"}`} />
      ))}
    </div>
  );
}

function KeywordChip({ kw, selected, onToggle }: { kw: Keyword; selected: boolean; onToggle: () => void }) {
  const color = CAT_COLORS[kw.category] || "#5C5C5C";
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition-all ${
        selected ? "border-transparent text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
      style={selected ? { background: color } : {}}
    >
      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
      {kw.label}
    </button>
  );
}

function CompetitorCard({ c, selected, onToggle }: { c: Competitor; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-xl border text-left w-full transition-all ${
        selected ? "border-blue-400 bg-blue-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {/* Logo via Clearbit */}
      <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://logo.clearbit.com/${c.domain}`}
          alt={c.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${c.domain}&sz=64`;
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-slate-800 truncate">{c.name}</div>
        <div className="text-[11px] text-slate-400">{c.category}</div>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 transition-all ${
        selected ? "border-blue-500 bg-blue-500" : "border-slate-300"
      }`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  );
}

function NavButtons({ onBack, onNext, nextLabel = "Continue", loading = false, disabled = false }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; loading?: boolean; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
      {onBack
        ? <button onClick={onBack} className="text-[13px] text-slate-400 hover:text-slate-600 transition-colors">← Back</button>
        : <span />}
      <button
        onClick={onNext}
        disabled={disabled || loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-40"
        style={{ background: "#0056D6" }}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {nextLabel}
        {!loading && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── wizard ────────────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [keywords, setKeywords] = useState<Keyword[]>(DEFAULT_KEYWORDS.slice(0, 8));
  const [competitors, setCompetitors] = useState<Competitor[]>(DEFAULT_COMPETITORS.slice(0, 8));
  const [kwInput, setKwInput] = useState("");
  const [compName, setCompName] = useState("");
  const [compDomain, setCompDomain] = useState("");
  const [schedule, setSchedule] = useState<"weekly" | "monthly" | "manual">("weekly");

  const toggleKw = (kw: Keyword) =>
    setKeywords((prev) =>
      prev.find((k) => k.id === kw.id) ? prev.filter((k) => k.id !== kw.id) : [...prev, kw]
    );

  const addKw = () => {
    const label = kwInput.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, "-");
    if (!keywords.find((k) => k.id === id))
      setKeywords((prev) => [...prev, { id, label, category: "custom" }]);
    setKwInput("");
  };

  const toggleComp = (c: Competitor) =>
    setCompetitors((prev) =>
      prev.find((x) => x.id === c.id) ? prev.filter((x) => x.id !== c.id) : [...prev, c]
    );

  const addComp = () => {
    const name = compName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-");
    const domain = compDomain.trim() || `${name.toLowerCase().replace(/\s+/g, "")}.com`;
    if (!competitors.find((c) => c.id === id))
      setCompetitors((prev) => [...prev, { id, name, domain, category: "Other", side: "adjacent" }]);
    setCompName("");
    setCompDomain("");
  };

  const handleStart = async () => {
    setSaving(true);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: BRAND,
          keywords,
          competitors,
          engines: ["claude"],
          schedule: {
            frequency: schedule,
            cron: schedule === "weekly" ? "0 9 * * 1" : schedule === "monthly" ? "0 9 1 * *" : null,
            enabled: schedule !== "manual",
          },
        }),
      });
      const runRes = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "full" }),
      });
      const runData = await runRes.json().catch(() => ({}));
      const jobId = runData?.jobId || "";
      router.push(`/setup/loading${jobId ? `?jobId=${jobId}` : ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Brand badge */}
      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-8 items-center rounded-md px-2.5" style={{ background: "#1F1F1F" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/risa-logo-white.png" alt="RISA" className="h-4 w-auto" />
        </span>
        <span className="text-[13px] text-slate-500 font-medium">GEO visibility for <strong className="text-slate-800">risalabs.ai</strong></span>
      </div>

      <StepIndicator step={step} total={2} />

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-500" /> What topics do you want to track?
          </h1>
          <p className="text-[14px] text-slate-500 mb-6">
            We generate AI prompts around each keyword and measure how RISA shows up in responses.
            <span className="ml-1 font-semibold text-slate-700">{keywords.length} selected.</span>
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {DEFAULT_KEYWORDS.map((kw) => (
              <KeywordChip key={kw.id} kw={kw} selected={!!keywords.find((k) => k.id === kw.id)} onToggle={() => toggleKw(kw)} />
            ))}
            {keywords.filter((k) => !DEFAULT_KEYWORDS.find((d) => d.id === k.id)).map((kw) => (
              <div key={kw.id} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white text-[13px] font-medium">
                {kw.label}
                <button onClick={() => setKeywords((p) => p.filter((x) => x.id !== kw.id))}>
                  <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="Add a custom keyword..."
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKw()}
            />
            <button onClick={addKw} className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <NavButtons onNext={() => setStep(2)} disabled={keywords.length === 0} />
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">Who are RISA&apos;s competitors?</h1>
          <p className="text-[14px] text-slate-500 mb-6">
            We track these across every prompt, pull their logos, and score their GEO readiness.
            <span className="ml-1 font-semibold text-slate-700">{competitors.length} selected.</span>
          </p>
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {DEFAULT_COMPETITORS.map((c) => (
              <CompetitorCard key={c.id} c={c} selected={!!competitors.find((x) => x.id === c.id)} onToggle={() => toggleComp(c)} />
            ))}
          </div>
          {competitors.filter((c) => !DEFAULT_COMPETITORS.find((d) => d.id === c.id)).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {competitors.filter((c) => !DEFAULT_COMPETITORS.find((d) => d.id === c.id)).map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white text-[13px] font-medium">
                  {c.name}
                  <button onClick={() => setCompetitors((p) => p.filter((x) => x.id !== c.id))}>
                    <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mb-1">
            <input
              className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="Competitor name..."
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComp()}
            />
            <input
              className="w-44 rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="domain.com"
              value={compDomain}
              onChange={(e) => setCompDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComp()}
            />
            <button onClick={addComp} className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Tracking schedule */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[12px] font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-500" /> Tracking schedule
            </div>
            <div className="flex gap-2">
              {(["weekly", "monthly", "manual"] as const).map((f) => (
                <button key={f} onClick={() => setSchedule(f)}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-all capitalize ${
                    schedule === f ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {schedule === "weekly" ? "Runs every Monday at 9am. Keeps your report fresh week-over-week."
                : schedule === "monthly" ? "Runs on the 1st of each month. Good for trend tracking."
                : "Only runs when you manually trigger it from Settings."}
            </p>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-slate-600">
            <ul className="space-y-1">
              <li><span className="text-slate-400">Brand:</span> RISA Labs (risalabs.ai)</li>
              <li><span className="text-slate-400">Keywords:</span> {keywords.length} — generates {keywords.length * 25}+ prompts</li>
              <li><span className="text-slate-400">Competitors:</span> {competitors.length} tracked with logo + GEO score</li>
              <li><span className="text-slate-400">Schedule:</span> {schedule}</li>
            </ul>
          </div>

          <NavButtons
            onBack={() => setStep(1)}
            onNext={handleStart}
            nextLabel="Save config and start run"
            loading={saving}
            disabled={competitors.length === 0}
          />
        </div>
      )}
    </div>
  );
}
