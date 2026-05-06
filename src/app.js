import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { createRequire } from "module";
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

import { buildOpenApiSpecs } from "./config/swagger.js";
import swaggerUi from "swagger-ui-express";
import { corsDynamicOrigin } from "./config/cors.config.js";
import connectDB from "./config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const isServerlessRuntime = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

const require = createRequire(import.meta.url);
let swaggerUiDistVersion = "5.11.0";
try {
  swaggerUiDistVersion = require("swagger-ui-dist/package.json").version;
} catch {
  /* swagger-ui-express may hoist swagger-ui-dist differently */
}

const swaggerUiAssetBase = `https://unpkg.com/swagger-ui-dist@${swaggerUiDistVersion}`;

function patchSwaggerUiHtml(html) {
  return html
    .replace(/href="\.\/swagger-ui\.css"/, `href="${swaggerUiAssetBase}/swagger-ui.css"`)
    .replace(/href="\.\/favicon-32x32\.png"/, `href="${swaggerUiAssetBase}/favicon-32x32.png"`)
    .replace(/href="\.\/favicon-16x16\.png"/, `href="${swaggerUiAssetBase}/favicon-16x16.png"`)
    .replace(/src="\.\/swagger-ui-bundle\.js"/, `src="${swaggerUiAssetBase}/swagger-ui-bundle.js"`)
    .replace(
      /src="\.\/swagger-ui-standalone-preset\.js"/,
      `src="${swaggerUiAssetBase}/swagger-ui-standalone-preset.js"`
    );
}

const swaggerUiHtmlOptions = {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Backend Mart API Documentation",
};

function swaggerUiIndex(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }
  const urlPath = (req.originalUrl || "").split("?")[0];
  if (urlPath !== "/api/docs" && urlPath !== "/api/docs/") {
    return next();
  }
  const html = patchSwaggerUiHtml(
    swaggerUi.generateHTML(buildOpenApiSpecs(), swaggerUiHtmlOptions)
  );
  res.type("html").send(html);
}

/** Routes that skip Mongo (matches lms-backend serverless gate). */
function routeSkipsDatabase(reqPath) {
  return (
    reqPath === "/" ||
    reqPath === "/health" ||
    reqPath === "/api" ||
    reqPath === "/favicon.ico" ||
    reqPath === "/openapi.json" ||
    reqPath === "/api/openapi.json" ||
    reqPath.startsWith("/api/docs") ||
    /^\/api-docs\/?$/i.test(reqPath)
  );
}

/**
 * Build Express app (no listen). Local entry connects DB in src/server.js.
 */
export function buildApp() {
  const app = express();

  if (isServerlessRuntime) {
    app.set("trust proxy", 1);
  }

  if (isServerlessRuntime) {
    let dbPromise;
    app.use(async (req, res, next) => {
      if (routeSkipsDatabase(req.path)) {
        return next();
      }
      try {
        if (!dbPromise) {
          dbPromise = connectDB();
        }
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
    ...(isServerlessRuntime ? { validate: { ip: false } } : {}),
  });

  if (process.env.NODE_ENV !== "test") {
    app.use("/api/", limiter);
  }

  if (isServerlessRuntime) {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://unpkg.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            "img-src": ["'self'", "data:", "blob:", "https://unpkg.com"],
            "font-src": ["'self'", "data:", "https://unpkg.com"],
          },
        },
      })
    );
  } else {
    app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
      })
    );
  }

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

  if (!isServerlessRuntime) {
    app.use(express.static(publicDir));
  }

  app.get("/", (_req, res) => {
    try {
      const indexPath = path.join(publicDir, "index.html");
      const html = readFileSync(indexPath, "utf8");
      return res.type("html").send(html);
    } catch {
      res.status(200).json({
        success: true,
        message: "Backend Mart API",
        version: "1.0.0",
        documentation: "/api/docs",
        health: "/health",
        openapi: "/openapi.json",
      });
    }
  });

  const serveOpenApi = (req, res) => {
    res.set("Cache-Control", "public, max-age=120");
    res.json(buildOpenApiSpecs());
  };
  app.get("/openapi.json", serveOpenApi);
  app.get("/api/openapi.json", serveOpenApi);

  app.use("/api/docs", swaggerUi.serve, swaggerUiIndex);

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
