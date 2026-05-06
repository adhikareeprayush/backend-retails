import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import "express-async-errors";

import authRoutes from "./routes/auth.routes.js";
import martRoutes from "./routes/mart.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import billRoutes from "./routes/bill.routes.js";
import reportRoutes from "./routes/report.routes.js";
import userRoutes from "./routes/user.routes.js";

import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import logger from "./utils/logger.js";

import swaggerSpec from "./config/swagger.js";
import swaggerUi from "swagger-ui-express";
import { corsDynamicOrigin } from "./config/cors.config.js";
import connectDB from "./config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

/**
 * Build Express app (no listen). Local entry connects DB in server.js; Vercel gates DB here.
 */
export function buildApp() {
  const app = express();

  app.set("trust proxy", 1);

  if (process.env.VERCEL) {
    const dbPromise = connectDB();
    app.use(async (req, res, next) => {
      try {
        await dbPromise;
        next();
      } catch (err) {
        next(err);
      }
    });
  }

  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    message: {
      success: false,
      message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  if (process.env.NODE_ENV !== "test") {
    app.use("/api/", limiter);
  }

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: corsDynamicOrigin(),
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );

  app.get(/^\/api-docs\/?$/i, (_req, res) => {
    res.redirect(302, "/api/docs/");
  });

  // On Vercel, files under public/ are served by the CDN; express.static is ignored there anyway.
  if (!process.env.VERCEL) {
    app.use(express.static(publicDir));
  }

  const serveOpenApi = (req, res) => {
    res.set("Cache-Control", "public, max-age=120");
    res.json(swaggerSpec);
  };
  app.get("/openapi.json", serveOpenApi);
  app.get("/api/openapi.json", serveOpenApi);

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/marts", martRoutes);
  app.use("/api/v1/marts/:martId/products", productRoutes);
  app.use("/api/v1/marts/:martId/categories", categoryRoutes);
  app.use("/api/v1/marts/:martId/inventory", inventoryRoutes);
  app.use("/api/v1/marts/:martId/customers", customerRoutes);
  app.use("/api/v1/marts/:martId/bills", billRoutes);
  app.use("/api/v1/marts/:martId/reports", reportRoutes);

  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Server is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  app.get("/api", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Backend Mart API",
      version: "1.0.0",
      documentation: "/api/docs",
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
