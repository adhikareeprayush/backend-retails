/**
 * Root shim for tools that expect ./server.js (npm start, older Vercel templates).
 * Canonical entry with side effects: ./src/server.js
 */
export { default } from "./src/server.js";
