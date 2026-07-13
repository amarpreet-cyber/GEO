import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestore } from "./firebase-admin";

// ── config (setup wizard output) ─────────────────────────────────────────────

export type AppConfig = {
  brand: { name: string; domain: string; aliases: string[] };
  keywords: { id: string; label: string; category: string }[];
  competitors: { id: string; name: string; domain: string; category: string; side: string }[];
  engines: string[];
  schedule: { cron: string; enabled: boolean };
  setup_complete: boolean;
};

export const getAppConfig = cache(async (): Promise<AppConfig | null> => {
  const db = getFirestore();
  if (!db) return null;
  try {
    const snap = await db.collection("geo_config").doc("current").get();
    return snap.exists ? (snap.data() as AppConfig) : null;
  } catch {
    return null;
  }
});

export async function saveAppConfig(config: Partial<AppConfig>): Promise<void> {
  const db = getFirestore();
  if (!db) throw new Error("Firestore not configured");
  await db.collection("geo_config").doc("current").set(
    { ...config, updated_at: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

// ── run history ──────────────────────────────────────────────────────────────

export type RunMeta = {
  id: string;
  stage: string;
  status: "running" | "complete" | "error";
  created_at: string;
  completed_at?: string;
  geo_score?: number;
  visibility_score?: number;
  mention_rate?: number;
  brand_share_of_voice?: number;
  error?: string;
};

export const listRuns = cache(async (limit = 20): Promise<RunMeta[]> => {
  const db = getFirestore();
  if (!db) return [];
  try {
    const snap = await db
      .collection("geo_runs")
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((d: any) => {
      const data = d.data();
      return {
        id: d.id,
        stage: data.stage || "",
        status: data.status || "complete",
        created_at: data.created_at?.toDate?.()?.toISOString() ?? d.id,
        completed_at: data.completed_at?.toDate?.()?.toISOString(),
        geo_score: data.geo_score?.geo_score,
        visibility_score: data.summary?.visibility_score,
        mention_rate: data.summary?.mention_rate,
        brand_share_of_voice: data.summary?.brand_share_of_voice,
        error: data.error,
      } as RunMeta;
    });
  } catch {
    return [];
  }
});

export const getLatestRun = cache(async () => {
  const runs = await listRuns(1);
  return runs[0] ?? null;
});

export async function createRunDoc(runId: string, stage: string): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  await db.collection("geo_runs").doc(runId).set({
    id: runId,
    stage,
    status: "running",
    created_at: FieldValue.serverTimestamp(),
  });
}

export async function updateRunStatus(
  runId: string,
  status: "running" | "complete" | "error",
  extra: Record<string, unknown> = {}
): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  await db.collection("geo_runs").doc(runId).update({
    status,
    ...(status !== "running" ? { completed_at: FieldValue.serverTimestamp() } : {}),
    ...extra,
  });
}

// Stage-flush lives in a React-cache-free module so the CLI (plain Node/tsx) can
// import it. Re-exported here for callers that reach for it via @/lib/firestore.
export { flushStageToFirestore } from "./firestore-sync";
