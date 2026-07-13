import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore as _gf } from "firebase-admin/firestore";

let _app: App | null = null;

export function getFirebaseApp(): App | null {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

  if (!saJson && !credPath && !projectId) return null;

  try {
    if (saJson) {
      const sa = JSON.parse(saJson);
      _app = initializeApp({ credential: cert(sa), projectId: sa.project_id || projectId });
    } else if (credPath) {
      _app = initializeApp({ credential: cert(credPath), projectId });
    } else {
      _app = initializeApp({ credential: applicationDefault(), projectId });
    }
    return _app;
  } catch (e) {
    console.warn("[firebase-admin] init failed:", e);
    return null;
  }
}

export function getFirestore() {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return _gf(app);
  } catch {
    return null;
  }
}
