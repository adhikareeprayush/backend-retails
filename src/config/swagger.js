import path from "path";
import { fileURLToPath } from "url";
import swaggerJsdoc from "swagger-jsdoc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveApiServerBase() {
  if (process.env.API_PUBLIC_URL) {
    return `${process.env.API_PUBLIC_URL.replace(/\/$/, "")}/api/v1`;
  }
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, "");
    return `https://${host}/api/v1`;
  }
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}/api/v1`;
}

const definition = {
  openapi: "3.0.0",
  info: {
    title: "Backend Mart API",
    version: "1.0.0",
    description:
      "A comprehensive mart management system API with multi-tenant support",
    contact: {
      name: "API Support",
      email: "support@backendmart.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: resolveApiServerBase(),
      description:
        process.env.NODE_ENV === "production"
          ? "Configured via API_PUBLIC_URL, VERCEL_URL, or PORT"
          : "Local development",
    },
  ],
  tags: [
    { name: "Authentication", description: "User authentication and authorization" },
    { name: "Users", description: "User management operations (Admin only)" },
    { name: "Marts", description: "Mart management operations" },
    { name: "Products", description: "Product management within marts" },
    { name: "Categories", description: "Product category management within marts" },
    { name: "Inventory", description: "Inventory tracking and management" },
    { name: "Customers", description: "Customer management within marts" },
    { name: "Bills", description: "Billing and transaction management" },
    { name: "Reports", description: "Analytics and reporting" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token in the format: Bearer <token>",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
        description: "Refresh token stored in HTTP-only cookie",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error message" },
          errors: { type: "array", items: { type: "object" } },
          timestamp: { type: "string", format: "date-time", example: "2023-09-04T12:00:00.000Z" },
        },
      },
      Success: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation successful" },
          data: { type: "object" },
          timestamp: { type: "string", format: "date-time", example: "2023-09-04T12:00:00.000Z" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const jsdocOptions = {
  definition,
  apis: [
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../controllers/*.js"),
    path.join(__dirname, "../models/*.js"),
  ],
};

function buildSwaggerSpec() {
  try {
    return swaggerJsdoc(jsdocOptions);
  } catch (err) {
    console.error("[swagger-jsdoc] startup failed, using minimal OpenAPI:", err.message);
    return {
      openapi: definition.openapi,
      info: definition.info,
      servers: definition.servers,
      tags: definition.tags,
      components: definition.components,
      security: definition.security,
      paths: {},
    };
  }
}

const swaggerSpec = buildSwaggerSpec();

export default swaggerSpec;
