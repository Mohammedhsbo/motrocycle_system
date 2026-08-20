import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  try {
    console.log('Adding Reservation_status_check...');
    await p.$executeRawUnsafe(`ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_status_check" CHECK (status IN ('active', 'converted', 'expired', 'cancelled'))`);
  } catch (e: any) {
    console.log('Status check might already exist:', e.message);
  }

  try {
    console.log('Adding Reservation_paidAmount_check...');
    await p.$executeRawUnsafe(`ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_paidAmount_check" CHECK ("paidAmount" <= "totalPrice")`);
  } catch (e: any) {
    console.log('Paid amount check might already exist:', e.message);
  }

  try {
    console.log('Adding Reservation_remainingAmount_check...');
    await p.$executeRawUnsafe(`ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_remainingAmount_check" CHECK ("remainingAmount" = "totalPrice" - "paidAmount")`);
  } catch (e: any) {
    console.log('Remaining amount check might already exist:', e.message);
  }

  console.log('Done adding constraints.');

  // Verify
  const checks = await p.$queryRaw<{ conname: string; consrc: string }[]>`
    SELECT conname, pg_get_constraintdef(oid) as consrc
    FROM pg_constraint
    WHERE conrelid = '"Reservation"'::regclass
      AND contype = 'c'
    ORDER BY conname
  `;
  console.log('Active CHECK constraints on Reservation:');
  checks.forEach(c => console.log(' -', c.conname, ':', c.consrc));

  await p.$disconnect();
}

main().catch(e => { console.error(e.message); p.$disconnect(); });
