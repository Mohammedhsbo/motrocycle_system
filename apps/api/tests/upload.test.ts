import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { createTestApp, closeTestApp, resetDatabase, seedBaseData, createRole, createStaffUser } from "./helpers.js";
import { StorageService } from "../src/upload/storage.service.js";

describe("Upload API", () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    // Override StorageService to mock S3 upload
    const mockStorageService = {
      uploadFile: vi.fn().mockResolvedValue({
        url: "http://localhost:9000/motorcycle-system-local/motorcycles/test-uuid.jpg",
        filename: "motorcycles/test-uuid.jpg",
      }),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };

    const AppModule = (await import("../src/app.module.js")).AppModule;
    const testingModule = await import("@nestjs/testing");
    const moduleRef = await testingModule.Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(StorageService)
    .useValue(mockStorageService)
    .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use((await import("cookie-parser")).default());
    app.useGlobalFilters(new (await import("../src/common/filters/app-exception.filter.js")).AppExceptionFilter());
    await app.init();

    await resetDatabase();
    const data = await seedBaseData();
    
    // Create role with motorcycle create permission
    const uploaderRole = await createRole("uploader", [
      { resource: "motorcycle", action: "create" },
    ]);
    
    const uploader = await createStaffUser({
      name: "Uploader User",
      email: "uploader@example.com",
      password: "password123",
      roleId: uploaderRole.id,
      branchId: data.branch.id,
    });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "uploader@example.com",
        password: "password123",
      });
      
    token = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should upload a valid image", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("fake image content"), "test.jpg");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("url");
    expect(res.body.data.url).toContain("test-uuid.jpg");
  });

  it("should reject invalid file types", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("fake content"), "test.txt");

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("should reject files exceeding max size", async () => {
    // Generate a 6MB buffer
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
    const res = await request(app.getHttpServer())
      .post("/api/v1/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", largeBuffer, "large.jpg");

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("should reject unauthorized requests", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/upload")
      .attach("file", Buffer.from("fake content"), "test.jpg");

    expect(res.status).toBe(401);
  });
});
