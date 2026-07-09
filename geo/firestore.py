"""Firestore sync — writes pipeline run output to Firestore after each stage.

Enabled only when FIREBASE_PROJECT_ID is set (or GOOGLE_APPLICATION_CREDENTIALS
or FIREBASE_SERVICE_ACCOUNT are present). Fails gracefully with a warning if
firebase-admin is not installed or credentials are missing.
"""
from __future__ import annotations

import csv
import json
import os
from typing import Any


def _init_app():
    """Initialise firebase_admin once and return (firebase_admin, firestore) or (None, None)."""
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        return None, None

    if firebase_admin._apps:
        return firebase_admin, firestore

    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    project = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("GCLOUD_PROJECT")

    try:
        if sa_json:
            import tempfile
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
                f.write(sa_json)
                tmp = f.name
            cred = credentials.Certificate(tmp)
            os.unlink(tmp)
        elif cred_path:
            cred = credentials.Certificate(cred_path)
        else:
            cred = credentials.ApplicationDefault()

        opts: dict[str, Any] = {}
        if project:
            opts["projectId"] = project
        firebase_admin.initialize_app(cred, opts)
        return firebase_admin, firestore
    except Exception as e:
        print(f"[firestore] init failed ({e}) — Firestore sync disabled")
        return None, None


class GeoStore:
    """Write GEO pipeline output to Firestore. No-ops silently when not configured."""

    def __init__(self):
        fa, fs = _init_app()
        if fa is None:
            self.enabled = False
            return
        try:
            from firebase_admin import firestore as _fs
            self._db = _fs.client()
            self._fs = _fs
            self.enabled = True
            print("[firestore] connected")
        except Exception as e:
            print(f"[firestore] client failed ({e}) — disabled")
            self.enabled = False

    # ── run lifecycle ────────────────────────────────────────────────────────

    def create_run(self, run_id: str, stage: str) -> None:
        if not self.enabled:
            return
        try:
            self._db.collection("geo_runs").document(run_id).set({
                "id": run_id,
                "stage": stage,
                "status": "running",
                "created_at": self._fs.SERVER_TIMESTAMP,
            })
            print(f"[firestore] run {run_id} created")
        except Exception as e:
            print(f"[firestore] create_run failed: {e}")

    def complete_run(self, run_id: str) -> None:
        if not self.enabled:
            return
        try:
            self._db.collection("geo_runs").document(run_id).update({
                "status": "complete",
                "completed_at": self._fs.SERVER_TIMESTAMP,
            })
            print(f"[firestore] run {run_id} complete")
        except Exception as e:
            print(f"[firestore] complete_run failed: {e}")

    def fail_run(self, run_id: str, error: str) -> None:
        if not self.enabled:
            return
        try:
            self._db.collection("geo_runs").document(run_id).update({
                "status": "error",
                "error": str(error)[:500],
                "completed_at": self._fs.SERVER_TIMESTAMP,
            })
        except Exception as e:
            print(f"[firestore] fail_run failed: {e}")

    # ── stage flush ──────────────────────────────────────────────────────────

    def flush_after_stage(self, run_id: str, output_dir: str, stage: str) -> None:
        """Read the output files produced by `stage` and sync to Firestore."""
        if not self.enabled:
            return
        try:
            data = self._stage_data(output_dir, stage)
            if data:
                self._db.collection("geo_runs").document(run_id).update(data)
                print(f"[firestore] flushed '{stage}'")
            # flush per-prompt data after analyze
            if stage in ("analyze", "all", "full"):
                self._flush_prompts(run_id, output_dir)
        except Exception as e:
            print(f"[firestore] flush_after_stage failed for '{stage}': {e}")

    def _stage_data(self, output_dir: str, stage: str) -> dict:
        data: dict[str, Any] = {}

        def rj(name: str):
            p = os.path.join(output_dir, name)
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            return None

        def rc(name: str):
            p = os.path.join(output_dir, name)
            if not os.path.exists(p):
                return None
            with open(p, "r", encoding="utf-8", newline="") as f:
                return list(csv.DictReader(f))

        if stage in ("analyze", "all", "full"):
            if (v := rj("summary_metrics.json")):
                data["summary"] = v
            norm: dict[str, Any] = {}
            for key in [
                "competitor_analysis", "citations", "share_of_voice",
                "rollup_topic", "rollup_persona", "rollup_intent", "rollup_engine",
                "recommended_actions", "emerging_topics",
            ]:
                rows = rc(f"normalized/{key}.csv")
                if rows is not None:
                    norm[key] = rows
            if norm:
                data["normalized"] = norm

        if stage in ("audit", "full"):
            if (v := rj("site_audit.json")):
                data["site_audit"] = v

        if stage in ("citability", "full"):
            if (v := rj("citability.json")):
                data["citability"] = v

        if stage in ("brand", "full"):
            if (v := rj("brand_presence.json")):
                data["brand_presence"] = v

        if stage in ("eeat", "full"):
            if (v := rj("eeat.json")):
                data["eeat"] = v

        if stage in ("compose", "full"):
            if (v := rj("geo_score.json")):
                data["geo_score"] = v

        if stage in ("comp-profile", "full"):
            if (v := rj("competitor_profiles.json")):
                data["competitor_profiles"] = v

        return data

    def _flush_prompts(self, run_id: str, output_dir: str) -> None:
        path = os.path.join(output_dir, "prompt_analysis.csv")
        if not os.path.exists(path):
            return

        # Group by unique prompt text (one Firestore doc per prompt).
        seen: dict[str, dict] = {}
        with open(path, "r", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                pt = row.get("prompt", "")
                if pt and pt not in seen:
                    seen[pt] = row

        batch = self._db.batch()
        coll = self._db.collection("geo_runs").document(run_id).collection("prompts")
        for i, (prompt_text, row) in enumerate(seen.items()):
            doc_id = f"p{i:03d}"
            cited_raw = row.get("cited_domains", "[]")
            try:
                cited = json.loads(cited_raw)
            except Exception:
                cited = []
            batch.set(coll.document(doc_id), {
                "prompt_id": doc_id,
                "prompt": prompt_text,
                "engine": row.get("engine", ""),
                "persona": row.get("persona", ""),
                "topic": row.get("topic", ""),
                "intent": row.get("intent", ""),
                "brand_mentioned": row.get("brand_mentioned", "False") == "True",
                "brand_position": int(row.get("brand_position") or 0),
                "brand_sentiment_label": row.get("brand_sentiment_label", "absent"),
                "n_citations": int(row.get("n_citations") or 0),
                "cited_domains": cited,
                "answer_summary": row.get("answer_summary", ""),
            })
            if (i + 1) % 490 == 0:
                batch.commit()
                batch = self._db.batch()
        batch.commit()
        print(f"[firestore] flushed {len(seen)} prompts")

    # ── config (read what the UI setup wizard saved) ─────────────────────────

    def get_config(self) -> dict | None:
        """Return the setup wizard config from Firestore, or None."""
        if not self.enabled:
            return None
        try:
            doc = self._db.collection("geo_config").document("current").get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"[firestore] get_config failed: {e}")
            return None
