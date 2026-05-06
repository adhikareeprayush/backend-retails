import logger from "../utils/logger.js";

/**
 * Builds the allowed browser origins set (full URLs, no trailing slash).
 * CORS only affects browsers; curl/Streamlit server-side calls typically omit Origin.
 */
export function getAllowedOriginsSet() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "";
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );

  if (process.env.API_PUBLIC_URL) {
    set.add(process.env.API_PUBLIC_URL.trim().replace(/\/$/, ""));
  }

  if (process.env.VERCEL_URL) {
    set.add(`https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`);
  }

  if (process.env.PUBLIC_SITE_URL) {
    set.add(process.env.PUBLIC_SITE_URL.trim().replace(/\/$/, ""));
  }

  if (process.env.STREAMLIT_PUBLIC_URL) {
    set.add(process.env.STREAMLIT_PUBLIC_URL.trim().replace(/\/$/, ""));
  }

  if (set.size === 0 && process.env.NODE_ENV === "development") {
    [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8501",
      "http://127.0.0.1:8501",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ].forEach((o) => set.add(o));
  }

  if (set.size === 0 && process.env.NODE_ENV === "production") {
    logger.warn(
      "ALLOWED_ORIGINS / CORS_ORIGIN / API_PUBLIC_URL unset — browsers may be blocked from cross-origin API calls. Add your site URL(s) and redeploy."
    );
  }

  return set;
}

/**
 * Express `cors` origin callback: allowlisted browser origins only when Origin is present.
 * Requests without Origin (server-side HTTP clients, Streamlit `requests`, curl) are allowed.
 */
export function corsDynamicOrigin() {
  const allowed = getAllowedOriginsSet();

  return function originCallback(origin, callback) {
    if (process.env.NODE_ENV === "test") {
      return callback(null, true);
    }

    if (!origin) {
      return callback(null, true);
    }

    const normalized = origin.replace(/\/$/, "");
    if (allowed.has(normalized)) {
      return callback(null, true);
    }

    logger.warn(`CORS rejected Origin: ${origin}`);
    return callback(null, false);
  };
}
