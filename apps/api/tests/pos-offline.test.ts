import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  closeTestApp,
  resetDatabase,
  seedBaseData,
  createRole,
  createStaffUser,
  prisma,
} from './helpers.js';

describe('POS Offline Tests', () => {
  let app: INestApplication;
  let cashierToken: string;
  let branchId: string;
  let cashierUser: any;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase();
    const data = await seedBaseData();
    branchId = data.branch.id;

    const role = await createRole('cashier', [
      { resource: 'order', action: 'read' },
      { resource: 'customer', action: 'create' },
      { resource: 'customer', action: 'read' },
    ]);

    cashierUser = await createStaffUser('cashier@test.com', 'pass123', role.id, branchId);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cashier@test.com', password: 'pass123' });
    cashierToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('Sync Status', () => {
    it('should get offline sync status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/pos/offline/sync-status')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isOnline');
      expect(res.body.data).toHaveProperty('queuedOperations');
      expect(res.body.data).toHaveProperty('conflicts');
      expect(Array.isArray(res.body.data.conflicts)).toBe(true);
    });
  });

  describe('Queue Operations', () => {
    it('should queue customer create operation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/pos/offline/queue')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          type: 'customer_create',
          data: {
            name: 'Offline Customer',
            phone: '+966509999999',
            email: 'offline@test.com',
          },
          localTimestamp: new Date().toISOString(),
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('queueId');
      expect(res.body.data).toHaveProperty('position');
    });

    it('should queue customer update operation', async () => {
      // Create customer first
      const customer = await prisma.customer.create({
        data: {
          name: 'Update Test',
          phone: '+966508888888',
          isActive: true,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/pos/offline/queue')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          type: 'customer_update',
          data: {
            customerId: customer.id,
            name: 'Updated Name',
            timestamp: new Date().toISOString(),
          },
          localTimestamp: new Date().toISOString(),
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject invalid offline operation types', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/pos/offline/queue')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          type: 'motorcycle_sale',
          data: { motorcycleId: 'test' },
          localTimestamp: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should enforce queue limit', async () => {
      // Queue 10 operations
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/pos/offline/queue')
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({
            type: 'customer_create',
            data: {
              name: `Queue Test ${i}`,
              phone: `+96650700000${i}`,
            },
            localTimestamp: new Date().toISOString(),
          });
      }

      // 11th should fail
      const res = await request(app.getHttpServer())
        .post('/api/v1/pos/offline/queue')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          type: 'customer_create',
          data: {
            name: 'Queue Limit Test',
            phone: '+966507000099',
          },
          localTimestamp: new Date().toISOString(),
        })
        .expect(409);

      expect(res.body.code).toBe('QUEUE_LIMIT_EXCEEDED');
    });

    it('should reject operations exceeding size limit', async () => {
      const largeData = {
        name: 'Test',
        phone: '+966501234567',
        notes: 'A'.repeat(15000), // >10KB
      };

      await request(app.getHttpServer())
        .post('/api/v1/pos/offline/queue')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          type: 'customer_create',
          data: largeData,
          localTimestamp: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('Get Queued Operations', () => {
    it('should get user queued operations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/pos/offline/queue')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
