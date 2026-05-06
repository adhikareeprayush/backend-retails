/**
 * Integration tests (MongoDB via mongodb-memory-server).
 * Skips email / password-reset flows per project requirements.
 */
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import connectDB from "../../src/config/database.js";
import { buildApp } from "../../src/app.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-minimum-32-characters-long";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "test-jwt-refresh-secret-key-minimum-32-characters";

describe("HTTP API", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    await connectDB();
    app = buildApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    delete globalThis.__mongoose;
    await mongoServer.stop();
  });

  const uniqueEmail = () => `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  it("GET /health", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET / serves landing page HTML", async () => {
    const res = await request(app).get("/").expect(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("Backend Mart");
  });

  it("GET /openapi.json returns OpenAPI document", async () => {
    const res = await request(app).get("/openapi.json").expect(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info.title).toBeTruthy();
  });

  it("GET /api-docs redirects to Swagger UI", async () => {
    const withSlash = await request(app).get("/api-docs/").expect(302);
    expect(withSlash.headers.location).toBe("/api/docs/");
    const noSlash = await request(app).get("/api-docs").expect(302);
    expect(noSlash.headers.location).toBe("/api/docs/");
  });

  it("GET /api", async () => {
    const res = await request(app).get("/api").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.documentation).toBe("/api/docs");
  });

  it("auth register, login, me, logout", async () => {
    const email = uniqueEmail();
    const reg = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Test User",
        email,
        password: "secret123",
        role: "user",
      })
      .expect(201);

    expect(reg.body.success).toBe(true);
    expect(reg.body.data.token).toBeTruthy();

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "secret123" })
      .expect(200);

    const token = login.body.data.token;
    expect(token).toBeTruthy();

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(me.body.data.user.email).toBe(email);

    await request(app).post("/api/v1/auth/logout").expect(200);
  });

  it("marts, categories, products, nested reads", async () => {
    const email = uniqueEmail();
    const reg = await request(app).post("/api/v1/auth/register").send({
      name: "Mart Owner",
      email,
      password: "secret123",
      role: "user",
    });
    const token = reg.body.data.token;

    const martPayload = {
      name: "Integration Mart",
      category: "grocery",
      address: {
        street: "100 Market St",
        city: "Springfield",
        state: "IL",
        zipCode: "62701",
        country: "USA",
      },
      contact: {
        phone: "+15559876543",
      },
    };

    const createMartRes = await request(app)
      .post("/api/v1/marts")
      .set("Authorization", `Bearer ${token}`)
      .send(martPayload)
      .expect(201);

    const martId = createMartRes.body.data._id;
    expect(martId).toBeTruthy();

    await request(app)
      .get("/api/v1/marts")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get(`/api/v1/marts/${martId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .put(`/api/v1/marts/${martId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Integration Mart Updated" })
      .expect(200);

    const catRes = await request(app)
      .post(`/api/v1/marts/${martId}/categories`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "General", description: "General merchandise" })
      .expect(201);

    const categoryId = catRes.body.data._id;

    await request(app)
      .get(`/api/v1/marts/${martId}/categories`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get(`/api/v1/marts/${martId}/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .put(`/api/v1/marts/${martId}/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Updated description" })
      .expect(200);

    const productPayload = {
      name: "Test Product",
      category: categoryId,
      sku: `SKU-${Date.now()}`,
      pricing: {
        costPrice: 10,
        sellingPrice: 24.99,
      },
      inventory: {
        unit: "pcs",
        currentStock: 50,
        minStock: 5,
        maxStock: 200,
        trackInventory: true,
      },
    };

    const prodCreate = await request(app)
      .post(`/api/v1/marts/${martId}/products`)
      .set("Authorization", `Bearer ${token}`)
      .send(productPayload)
      .expect(201);

    const productId = prodCreate.body.data._id;

    await request(app)
      .get(`/api/v1/marts/${martId}/products`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get(`/api/v1/marts/${martId}/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .put(`/api/v1/marts/${martId}/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        pricing: { sellingPrice: 29.99, costPrice: 12 },
      })
      .expect(200);

    await request(app)
      .delete(`/api/v1/marts/${martId}/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .delete(`/api/v1/marts/${martId}/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get(`/api/v1/marts/${martId}/customers`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get(`/api/v1/marts/${martId}/bills`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get(`/api/v1/marts/${martId}/reports`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get(`/api/v1/marts/${martId}/inventory`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .delete(`/api/v1/marts/${martId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("admin list users", async () => {
    const email = uniqueEmail();
    await request(app).post("/api/v1/auth/register").send({
      name: "Admin User",
      email,
      password: "secret123",
      role: "admin",
    });

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "secret123" })
      .expect(200);

    await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(200);
  });

  it("non-admin cannot list all users", async () => {
    const email = uniqueEmail();
    const reg = await request(app).post("/api/v1/auth/register").send({
      name: "Regular",
      email,
      password: "secret123",
      role: "user",
    });

    await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${reg.body.data.token}`)
      .expect(403);
  });
});
