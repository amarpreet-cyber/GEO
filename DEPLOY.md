# Deploying RISA GEO to Firebase App Hosting (rapids-platform)

RISA GEO deploys as a **new, isolated App Hosting backend** named `risa-geo` inside
the shared `rapids-platform` project. It sits alongside `risa-outreach` and
`pharma-analytics` and **touches none of them**.

> ## Safety rules (do not break these on the shared project)
> - **Never** run a bare `firebase deploy` — it would try to deploy Firestore rules,
>   indexes, and other targets across the whole shared project.
> - This repo intentionally has **no `firebase.json`** (only `apphosting.yaml` +
>   `.firebaserc`) so there is nothing for an unscoped deploy to act on.
> - Only ever create/roll out the `risa-geo` backend and the `geo-*` secrets.
> - GEO writes only to its own Firestore collections: `geo_runs/*`, `geo_config/*`.

---

## One-time setup

All commands run from the repo root (`risa-geo/`) and target `rapids-platform`.

### 1. API-key secrets — created ✅, access grant pending

The three isolated `geo-*` secrets already exist in Cloud Secret Manager with your
keys (`geo-anthropic-key`, `geo-openai-key`, `geo-gemini-key`). Do **not** use
`firebase apphosting:secrets:set --force` — it grants at the **project** level and
fails with a 403 under `roles/editor` (no project-IAM rights).

**Grant secret access — per-secret (run this yourself, before Step 2):**

```bash
SA=firebase-app-hosting-compute@rapids-platform.iam.gserviceaccount.com
for s in geo-anthropic-key geo-openai-key geo-gemini-key; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project rapids-platform
done
```

This is a **secret-level** IAM change (only these three secrets; nothing else on
the project). If it returns `403` your `roles/editor` also lacks
`secretmanager.secrets.setIamPolicy` — ask a project **Owner** to run it once, or
grant you `roles/secretmanager.admin`.

> Prefer to deploy the dashboard first without keys? Comment out the three
> `secret:` entries in `web/apphosting.yaml`, deploy, then add them back after the
> grant and roll out again.

### 2. Create the backend + connect GitHub (one-time, opens a browser)

This is the only interactive step — it connects the GitHub repo
(`amarpreet-cyber/GEO`) to the project via a browser OAuth flow.

```bash
firebase apphosting:backends:create --project rapids-platform
```

Answer the prompts:

| Prompt | Answer |
|---|---|
| Backend ID | `risa-geo` |
| Primary region | `us-central1` (match the sibling apps) |
| GitHub connection | authorize + pick `amarpreet-cyber/GEO` |
| Live branch | `main` |
| Root directory | `web` |

The first rollout builds and deploys automatically. When it finishes you get:

```
https://risa-geo--rapids-platform.us-central1.hosted.app
```

---

## Redeploying / refreshing data

- **Code changes:** push to `main` — App Hosting auto-rebuilds `risa-geo` only.
- **Manual rollout:** `firebase apphosting:rollouts:create risa-geo --project rapids-platform`
- **Refresh the dashboard's data snapshot:** the deployed dashboard reads the
  committed `web/data/output/` snapshot. To update it, run the pipeline locally
  and commit the result:

  ```bash
  cd web && npm run pipeline full        # or: npm run pipeline full -- --limit 25
  cd .. && git add -f web/data/output web/data/app-config.json && git commit -m "refresh GEO snapshot" && git push
  ```

---

## Known prod caveats (follow-ups, not blockers)

1. **Long pipeline runs don't complete inside a deployed request.** Cloud Run
   request timeouts + CPU-after-response throttling mean a full 246-prompt run
   won't finish server-side. Run the pipeline **locally** (writes to Firestore via
   `geo_runs/*` and refreshes the committed snapshot). A `--limit 25` preview may
   fit inside a request; a full run should stay local.
2. **The wizard's file write.** `/api/config` persists to Firestore
   (`geo_config/current`) which works in prod; the local-file mirror is skipped on
   Cloud Run's read-only filesystem. The `geo_setup_done` cookie gate still works.
3. **Pipeline output in prod** goes to `/tmp/geo-output` (`GEO_OUTPUT_DIR`), the
   only writable path on Cloud Run; the dashboard keeps reading the bundled
   snapshot (`GEO_READ_DIR` / bundled `data/output`).
