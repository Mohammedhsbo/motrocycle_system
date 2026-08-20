import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "./seed";

export const testPrisma = new PrismaClient();

export async function seedTestDatabase() {
  return seedDatabase();
}

export async function teardownTestDatabase() {
  await testPrisma.auditLog.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.rolePermission.deleteMany();
  await testPrisma.role.deleteMany();
  await testPrisma.branch.deleteMany();
}
