import dotenv from "dotenv";

dotenv.config();

import serverless from "serverless-http";
import connectDB from "../src/config/database.js";
import buildApp from "../src/app.js";

let handler;

export default async function vercelHandler(req, res) {
  if (!handler) {
    await connectDB();
    handler = serverless(buildApp());
  }
  return handler(req, res);
}
