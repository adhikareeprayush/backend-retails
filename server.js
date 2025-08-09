import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import "express-async-errors";
import dotenv from "dotenv";

dotenv.config();

// Routes
import authRoutes from "./src/routes/auth.routes.js";
import martRoutes from "./src/routes/mart.routes.js";
import productRoutes from "./src/routes/product.routes.js";
import categoryRoutes from "./src/routes/category.routes.js";
import inventoryRoutes from "./src/routes/inventory.routes.js";
import customerRoutes from "./src/routes/customer.routes.js";
import billRoutes from "./src/routes/bill.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import userRoutes from "./src/routes/user.routes.js";

// Import middleware
import errorHandler from "./src/middleware/errorHandler.js";
import notFound from "./src/middleware/notFound.js";
import logger from "./src/utils/logger.js";

// Import database connection
import connectDB from "./src/config/database.js";

// Import Swagger configuration
import swaggerSpec from "./src/config/swagger.js";
import swaggerUi from "swagger-ui-express";

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use("/api/", limiter);

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Other middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(mongoSanitize());

// Morgan logger with Winston
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// API Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/marts", martRoutes);
app.use("/api/v1/marts/:martId/products", productRoutes);
app.use("/api/v1/marts/:martId/categories", categoryRoutes);
app.use("/api/v1/marts/:martId/inventory", inventoryRoutes);
app.use("/api/v1/marts/:martId/customers", customerRoutes);
app.use("/api/v1/marts/:martId/bills", billRoutes);
app.use("/api/v1/marts/:martId/reports", reportRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend Mart API",
    version: "1.0.0",
    documentation: "/api/docs",
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Connect to database
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(
    `API Documentation available at http://localhost:${PORT}/api/docs`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info("MongoDB connection closed");
      process.exit(0);
    });
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

export default app;
