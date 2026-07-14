"use client";
// Setup wizard — Keywords → Competitors → Start.
// Brand pre-fixed to RISA Labs. Palette strictly RISA: white / blue / black.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Plus, X, Loader2, Hash, Swords, Zap } from "lucide-react";

// ── RISA palette ────────────────────────────────────────────────────────────
const BLUE = "#0056D6";
const BLACK = "#0A0A0A";

const BRAND = {
  name: "RISA Labs",
  domain: "risalabs.ai",
  aliases: ["RISA", "RISA AI", "RISA Labs AI"],
};

// Suggestions only — everything is user-editable; category is metadata for the pipeline.
const SUGGESTED_KEYWORDS = [
  { id: "prior-auth", label: "Prior Authorization", category: "core" },
  { id: "prior-auth-short", label: "Prior Auth", category: "core" },
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
  { id: "peer-to-peer", label: "Peer-to-Peer Reviews", category: "clinical" },
  { id: "specialty-pharmacy", label: "Specialty Pharmacy", category: "clinical" },
];

const SUGGESTED_COMPETITORS = [
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

type Keyword = { id: string; label: string; category: string };
type Competitor = { id: string; name: string; domain: string; category: string; side: string };

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ── UI atoms ──────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  const labels = ["Keywords", "Competitors"];
  return (
    <div className="flex items-center gap-3 mb-8">
      {labels.map((l, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={l} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold transition-all"
                style={{
                  background: done || active ? BLUE : "#fff",
                  color: done || active ? "#fff" : "#9AA3AF",
                  border: done || active ? "none" : "1.5px solid #E2E5EA",
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className="text-[13px] font-semibold" style={{ color: active || done ? BLACK : "#9AA3AF" }}>{l}</span>
            </div>
            {i < labels.length - 1 && <div className="w-8 h-px bg-slate-200" />}
          </div>
        );
      })}
    </div>
  );
}

// A tracked (selected) pill — RISA blue, removable.
function TrackedPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-[13px] font-semibold text-white shadow-sm"
      style={{ background: BLUE }}
    >
      {label}
      <button onClick={onRemove} className="w-4 h-4 rounded-full grid place-items-center hover:bg-white/25 transition-colors" aria-label={`Remove ${label}`}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// A suggestion chip — outline, click to add.
function SuggestChip({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border border-slate-200 bg-white text-slate-600 hover:border-[color:var(--b)] hover:text-[color:var(--b)] transition-colors"
      style={{ ["--b" as string]: BLUE }}
    >
      <Plus className="w-3.5 h-3.5 opacity-60" />
      {label}
    </button>
  );
}

function NavButtons({ onBack, onNext, nextLabel = "Continue", loading = false, disabled = false }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; loading?: boolean; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
      {onBack ? (
        <button onClick={onBack} className="text-[13px] font-medium text-slate-400 hover:text-slate-700 transition-colors">← Back</button>
      ) : <span />}
      <button
        onClick={onNext}
        disabled={disabled || loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-40 hover:brightness-110"
        style={{ background: BLUE }}
      >
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

  const [keywords, setKeywords] = useState<Keyword[]>(SUGGESTED_KEYWORDS.slice(0, 8));
  const [competitors, setCompetitors] = useState<Competitor[]>(SUGGESTED_COMPETITORS.slice(0, 8));
  const [kwInput, setKwInput] = useState("");
  const [compName, setCompName] = useState("");
  const [compDomain, setCompDomain] = useState("");
  const [schedule, setSchedule] = useState<"weekly" | "monthly" | "manual">("weekly");

  // keywords ------------------------------------------------------------------
  const hasKw = (id: string) => keywords.some((k) => k.id === id);
  const addKwRaw = (label: string, category = "custom") => {
    const id = slug(label);
    if (!id || hasKw(id)) return;
    setKeywords((prev) => [...prev, { id, label: label.trim(), category }]);
  };
  const addCustomKw = () => {
    // allow comma-separated bulk entry, e.g. "prior auth, denials, appeals"
    kwInput.split(",").map((s) => s.trim()).filter(Boolean).forEach((l) => addKwRaw(l));
    setKwInput("");
  };
  const removeKw = (id: string) => setKeywords((prev) => prev.filter((k) => k.id !== id));

  // competitors ---------------------------------------------------------------
  const hasComp = (id: string) => competitors.some((c) => c.id === id);
  const addComp = () => {
    const name = compName.trim();
    if (!name) return;
    const id = slug(name);
    const domain = compDomain.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    if (!hasComp(id)) setCompetitors((prev) => [...prev, { id, name, domain, category: "Custom", side: "adjacent" }]);
    setCompName(""); setCompDomain("");
  };
  const removeComp = (id: string) => setCompetitors((prev) => prev.filter((c) => c.id !== id));
  const addSuggestedComp = (c: Competitor) => !hasComp(c.id) && setCompetitors((prev) => [...prev, c]);

  const suggestKw = SUGGESTED_KEYWORDS.filter((k) => !hasKw(k.id));
  const suggestComp = SUGGESTED_COMPETITORS.filter((c) => !hasComp(c.id));

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
          engines: ["claude", "openai", "gemini"],
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
        body: JSON.stringify({ stage: "full", limit: 25 }),
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
      {/* Brand header */}
      <div className="flex items-center gap-3 mb-7">
        <span className="flex h-9 items-center rounded-lg px-3" style={{ background: BLACK }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/risa-logo-white.png" alt="RISA" className="h-4 w-auto" />
        </span>
        <div className="leading-tight">
          <div className="text-[15px] font-bold" style={{ color: BLACK }}>RISA GEO</div>
          <div className="text-[12px] text-slate-400 font-medium">Answer-engine visibility · risalabs.ai</div>
        </div>
      </div>

      <Stepper step={step} />

      {/* STEP 1 — KEYWORDS */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `${BLUE}14` }}>
              <Hash className="w-4 h-4" style={{ color: BLUE }} />
            </div>
            <h1 className="text-[22px] font-bold" style={{ color: BLACK }}>What should we track?</h1>
          </div>
          <p className="text-[13.5px] text-slate-500 mb-6 leading-relaxed">
            Add any topic RISA cares about — a full phrase like <em>Prior Authorization</em> or a short form like <em>Prior Auth</em>.
            We build ~25 AI prompts per keyword and measure where RISA shows up.
          </p>

          {/* Add box — the primary action, up top */}
          <label className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Add your own</label>
          <div className="flex gap-2 mt-2 mb-6">
            <input
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ ["--tw-ring-color" as string]: `${BLUE}55` }}
              placeholder="e.g. Prior Auth, Denial Appeals, Specialty Pharmacy…"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomKw()}
            />
            <button
              onClick={addCustomKw}
              disabled={!kwInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-40 hover:brightness-110"
              style={{ background: BLUE }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Tracked keywords */}
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[12px] font-bold uppercase tracking-wide text-slate-400">
              Tracking · {keywords.length}
            </label>
            {keywords.length > 0 && (
              <button onClick={() => setKeywords([])} className="text-[12px] text-slate-400 hover:text-slate-600">Clear all</button>
            )}
          </div>
          {keywords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-[13px] text-slate-400">
              No keywords yet — add one above or pick a suggestion below.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => <TrackedPill key={k.id} label={k.label} onRemove={() => removeKw(k.id)} />)}
            </div>
          )}

          {/* Suggestions */}
          {suggestKw.length > 0 && (
            <>
              <label className="block mt-6 mb-2.5 text-[12px] font-bold uppercase tracking-wide text-slate-400">Suggestions</label>
              <div className="flex flex-wrap gap-2">
                {suggestKw.map((k) => <SuggestChip key={k.id} label={k.label} onAdd={() => addKwRaw(k.label, k.category)} />)}
              </div>
            </>
          )}

          <NavButtons onNext={() => setStep(2)} disabled={keywords.length === 0} />
        </div>
      )}

      {/* STEP 2 — COMPETITORS */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `${BLUE}14` }}>
              <Swords className="w-4 h-4" style={{ color: BLUE }} />
            </div>
            <h1 className="text-[22px] font-bold" style={{ color: BLACK }}>Who are the competitors?</h1>
          </div>
          <p className="text-[13.5px] text-slate-500 mb-6 leading-relaxed">
            Tracked across every prompt — we pull each logo and score their GEO readiness.
            <span className="ml-1 font-semibold text-slate-700">{competitors.length} tracked.</span>
          </p>

          {/* Add competitor */}
          <label className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Add your own</label>
          <div className="flex gap-2 mt-2 mb-6">
            <input
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ ["--tw-ring-color" as string]: `${BLUE}55` }}
              placeholder="Competitor name"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComp()}
            />
            <input
              className="w-40 rounded-xl border border-slate-200 px-4 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ ["--tw-ring-color" as string]: `${BLUE}55` }}
              placeholder="domain.com"
              value={compDomain}
              onChange={(e) => setCompDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComp()}
            />
            <button
              onClick={addComp}
              disabled={!compName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-40 hover:brightness-110"
              style={{ background: BLUE }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Tracked competitors */}
          <label className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Tracking · {competitors.length}</label>
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            {competitors.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white">
                <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-50 grid place-items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://logo.clearbit.com/${c.domain}`}
                    alt={c.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${c.domain}&sz=64`; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: BLACK }}>{c.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{c.domain}</div>
                </div>
                <button onClick={() => removeComp(c.id)} className="w-6 h-6 rounded-lg grid place-items-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {suggestComp.length > 0 && (
            <>
              <label className="block mt-6 mb-2.5 text-[12px] font-bold uppercase tracking-wide text-slate-400">Suggestions</label>
              <div className="flex flex-wrap gap-2">
                {suggestComp.map((c) => (
                  <button key={c.id} onClick={() => addSuggestedComp(c)}
                    className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-[color:var(--b)] transition-colors"
                    style={{ ["--b" as string]: BLUE }}>
                    <span className="w-5 h-5 rounded-md overflow-hidden bg-slate-50 grid place-items-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://logo.clearbit.com/${c.domain}`} alt="" className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${c.domain}&sz=32`; }} />
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">{c.name}</span>
                    <Plus className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Schedule */}
          <div className="mt-7 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" style={{ color: BLUE }} /> Refresh schedule
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["weekly", "monthly", "manual"] as const).map((f) => (
                <button key={f} onClick={() => setSchedule(f)}
                  className="py-2 rounded-lg text-[13px] font-semibold border transition-all capitalize"
                  style={schedule === f
                    ? { background: BLUE, borderColor: BLUE, color: "#fff" }
                    : { background: "#fff", borderColor: "#E2E5EA", color: "#64707F" }}>
                  {f}
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-slate-400 mt-2.5">
              {schedule === "weekly" ? "Runs every Monday 9am — fresh week-over-week."
                : schedule === "monthly" ? "Runs the 1st of each month — good for trend lines."
                : "Runs only when you trigger it from Settings."}
            </p>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 rounded-xl border text-[13px]" style={{ borderColor: `${BLUE}22`, background: `${BLUE}08` }}>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-600">
              <span><span className="text-slate-400">Keywords</span> · <strong style={{ color: BLACK }}>{keywords.length}</strong> → ~{keywords.length * 25} prompts</span>
              <span><span className="text-slate-400">Competitors</span> · <strong style={{ color: BLACK }}>{competitors.length}</strong></span>
              <span><span className="text-slate-400">Engines</span> · <strong style={{ color: BLACK }}>Claude · GPT-4o · Gemini</strong></span>
              <span><span className="text-slate-400">Schedule</span> · <strong style={{ color: BLACK }} className="capitalize">{schedule}</strong></span>
            </div>
          </div>

          <NavButtons
            onBack={() => setStep(1)}
            onNext={handleStart}
            nextLabel="Save & start run"
            loading={saving}
            disabled={competitors.length === 0}
          />
        </div>
      )}
    </div>
  );
}
