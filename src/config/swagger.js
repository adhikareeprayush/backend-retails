import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
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
        url:
          process.env.NODE_ENV === "production"
            ? "https://your-production-domain.com/api/v1"
            : `http://localhost:${process.env.PORT || 5000}/api/v1`,
        description:
          process.env.NODE_ENV === "production"
            ? "Production server"
            : "Development server",
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "User authentication and authorization",
      },
      {
        name: "Users",
        description: "User management operations (Admin only)",
      },
      {
        name: "Marts",
        description: "Mart management operations",
      },
      {
        name: "Products",
        description: "Product management within marts",
      },
      {
        name: "Categories",
        description: "Product category management within marts",
      },
      {
        name: "Inventory",
        description: "Inventory tracking and management",
      },
      {
        name: "Customers",
        description: "Customer management within marts",
      },
      {
        name: "Bills",
        description: "Billing and transaction management",
      },
      {
        name: "Reports",
        description: "Analytics and reporting",
      },
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
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
              },
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2023-09-04T12:00:00.000Z",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Operation successful",
            },
            data: {
              type: "object",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2023-09-04T12:00:00.000Z",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js", "./src/models/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
