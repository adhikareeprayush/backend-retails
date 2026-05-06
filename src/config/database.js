import mongoose from "mongoose";
import logger from "../utils/logger.js";

const globalCache = globalThis;

/**
 * Reuse Mongoose connection across Vercel serverless invocations (and dev hot reload).
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("MONGODB_URI is not defined");
    if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw new Error("MONGODB_URI is not defined");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!globalCache.__mongoose) {
    globalCache.__mongoose = { conn: null, promise: null };
  }

  const g = globalCache.__mongoose;

  if (!g.promise) {
    g.promise = mongoose
      .connect(uri)
      .then((m) => {
        logger.info(`MongoDB Connected: ${m.connection.host}`);
        m.connection.on("error", (err) => {
          logger.error(`Mongoose connection error: ${err.message}`);
        });
        m.connection.on("disconnected", () => {
          logger.warn("Mongoose disconnected from MongoDB");
        });
        return m;
      })
      .catch((err) => {
        g.promise = null;
        logger.error(`Error connecting to MongoDB: ${err.message}`);
        if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
          process.exit(1);
        }
        throw err;
      });
  }

  g.conn = await g.promise;
  return g.conn;
};

export default connectDB;
