/**
 * Vercel serverless entry — same pattern as lms-backend:
 * vercel.json rewrites all traffic here; default export is the Express app.
 */
import app from "../src/server.js";

export default app;
