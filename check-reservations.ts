import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Verify custom check constraints exist in pg_constraint
  const checks = await prisma.$queryRaw<{ conname: string; consrc: string }[]>`
    SELECT conname, pg_get_constraintdef(oid) as consrc
    FROM pg_constraint
    WHERE conrelid = '"Reservation"'::regclass
      AND contype = 'c'
    ORDER BY conname
  `;
  console.log('Custom CHECK constraints:');
  checks.forEach(c => console.log(' -', c.conname, ':', c.consrc));

  // 2. Verify indexes
  const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'Reservation'
    ORDER BY indexname
  `;
  console.log('\nIndexes:');
  indexes.forEach(i => console.log(' -', i.indexname));

  // 3. Run seed data
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  if (!adminUser) { console.error('No admin user - seed seedDatabase first'); return; }

  const branches = await prisma.branch.findMany({ orderBy: { createdAt: 'asc' } });
  const customers = await prisma.customer.findMany({ take: 10, orderBy: { createdAt: 'asc' } });

  if (branches.length < 1 || customers.length < 3) {
    console.error('Need branches and customers first');
    return;
  }

  const mainBranch = branches[0];
  const northBranch = branches[1] ?? branches[0];

  const motoVins = ['JKBZXN23A0A000001','JKBZXN23A0A000002','JH2RC5006MM000003','JKBZXN23A0A000003',
    'JH2RC5006MM000005','JYARN23E0MA000004','JH2RC5006MM000006','JYARN23E0MA000005',
    'JKBZXN23A0A000005','JH2RC5006MM000007','JYARN23E0MA000006'];
  const motos = await prisma.motorcycle.findMany({ where: { vin: { in: motoVins } } });
  const motoMap = new Map(motos.map(m => [m.vin, m]));

  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const seeds = [
    { num: 'RES-MAN-2026-00001', vin: 'JKBZXN23A0A000001', branch: mainBranch, cust: 0, status: 'active' as const, total: 28000, paid: 5000, exp: daysFromNow(5), notes: 'عميل جاد في الشراء' },
    { num: 'RES-MAN-2026-00002', vin: 'JKBZXN23A0A000002', branch: mainBranch, cust: 1, status: 'active' as const, total: 32000, paid: 8000, exp: daysFromNow(3), notes: null },
    { num: 'RES-MAN-2026-00003', vin: 'JH2RC5006MM000003', branch: mainBranch, cust: 2, status: 'active' as const, total: 95000, paid: 20000, exp: daysFromNow(1), notes: 'يريد استلام الدراجة آخر الشهر' },
    { num: 'RES-MAN-2026-00004', vin: 'JKBZXN23A0A000003', branch: mainBranch, cust: 3 % customers.length, status: 'active' as const, total: 48000, paid: 10000, exp: daysFromNow(14), notes: null },
    { num: 'RES-NOR-2026-00001', vin: 'JH2RC5006MM000005', branch: northBranch, cust: 4 % customers.length, status: 'active' as const, total: 32000, paid: 5000, exp: daysFromNow(7), notes: null },
    { num: 'RES-NOR-2026-00002', vin: 'JYARN23E0MA000004', branch: northBranch, cust: 5 % customers.length, status: 'active' as const, total: 72000, paid: 15000, exp: daysFromNow(2), notes: 'العميل سيدفع المبلغ كاملاً خلال يومين' },
    { num: 'RES-NOR-2026-00003', vin: 'JH2RC5006MM000006', branch: northBranch, cust: 6 % customers.length, status: 'active' as const, total: 29000, paid: 3000, exp: daysFromNow(10), notes: null },
    { num: 'RES-NOR-2026-00004', vin: 'JKBZXN23A0A000005', branch: northBranch, cust: 7 % customers.length, status: 'active' as const, total: 39000, paid: 10000, exp: daysFromNow(0), notes: 'يجب متابعة العميل اليوم' },
    { num: 'RES-NOR-2026-00005', vin: 'JH2RC5006MM000007', branch: northBranch, cust: 8 % customers.length, status: 'active' as const, total: 58000, paid: 12000, exp: daysFromNow(20), notes: null },
    { num: 'RES-NOR-2026-00006', vin: 'JYARN23E0MA000006', branch: northBranch, cust: 9 % customers.length, status: 'active' as const, total: 26000, paid: 5000, exp: daysFromNow(30), notes: null },
    { num: 'RES-MAN-2025-00001', vin: 'JKBZXN23A0A000001', branch: mainBranch, cust: 0, status: 'expired' as const, total: 28000, paid: 3000, exp: daysAgo(5), notes: 'انتهى الحجز ولم يتم الدفع' },
    { num: 'RES-NOR-2025-00001', vin: 'JH2RC5006MM000005', branch: northBranch, cust: 1, status: 'expired' as const, total: 32000, paid: 2000, exp: daysAgo(10), notes: null },
    { num: 'RES-MAN-2025-00002', vin: 'JKBZXN23A0A000002', branch: mainBranch, cust: 2, status: 'expired' as const, total: 32000, paid: 5000, exp: daysAgo(3), notes: 'تم إبلاغ العميل' },
    { num: 'RES-MAN-2025-00003', vin: 'JH2RC5006MM000003', branch: mainBranch, cust: 3 % customers.length, status: 'cancelled' as const, total: 95000, paid: 10000, exp: daysFromNow(7), notes: 'العميل ألغى الطلب بسبب تغيير الرأي' },
    { num: 'RES-NOR-2025-00002', vin: 'JYARN23E0MA000004', branch: northBranch, cust: 4 % customers.length, status: 'cancelled' as const, total: 72000, paid: 0, exp: daysFromNow(5), notes: null },
    { num: 'RES-MAN-2025-00004', vin: 'JKBZXN23A0A000003', branch: mainBranch, cust: 5 % customers.length, status: 'cancelled' as const, total: 48000, paid: 5000, exp: daysAgo(1), notes: 'إلغاء بطلب العميل' },
    { num: 'RES-NOR-2025-00003', vin: 'JH2RC5006MM000006', branch: northBranch, cust: 6 % customers.length, status: 'cancelled' as const, total: 29000, paid: 2000, exp: daysFromNow(3), notes: null },
    { num: 'RES-MAN-2025-00005', vin: 'JKBZXN23A0A000001', branch: mainBranch, cust: 7 % customers.length, status: 'converted' as const, total: 28000, paid: 28000, exp: daysAgo(20), notes: 'تم التحويل إلى طلب شراء' },
    { num: 'RES-NOR-2025-00004', vin: 'JH2RC5006MM000007', branch: northBranch, cust: 8 % customers.length, status: 'converted' as const, total: 58000, paid: 20000, exp: daysAgo(15), notes: null },
    { num: 'RES-MAN-2025-00006', vin: 'JKBZXN23A0A000002', branch: mainBranch, cust: 9 % customers.length, status: 'converted' as const, total: 32000, paid: 10000, exp: daysAgo(8), notes: 'العميل دفع مبلغاً كبيراً كعربون' },
  ];

  let created = 0;
  for (const s of seeds) {
    const moto = motoMap.get(s.vin);
    if (!moto) { console.warn('Missing vin', s.vin); continue; }
    const remaining = s.total - s.paid;
    await prisma.reservation.upsert({
      where: { reservationNumber: s.num },
      update: { status: s.status, totalPrice: s.total, paidAmount: s.paid, remainingAmount: remaining, expiresAt: s.exp, notes: s.notes },
      create: {
        reservationNumber: s.num,
        customerId: customers[s.cust].id,
        motorcycleId: moto.id,
        branchId: s.branch.id,
        userId: adminUser.id,
        status: s.status,
        totalPrice: s.total,
        paidAmount: s.paid,
        remainingAmount: remaining,
        expiresAt: s.exp,
        notes: s.notes,
      },
    });
    created++;
  }

  console.log(`\n✅ Seeded ${created} reservations`);

  // 4. Final count + distribution
  const total = await prisma.reservation.count();
  const dist = await prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
    SELECT status, COUNT(*) as cnt FROM "Reservation" GROUP BY status ORDER BY status
  `;
  console.log(`Total reservations: ${total}`);
  console.log('Status distribution:', JSON.stringify(dist, (_, v) => typeof v === 'bigint' ? v.toString() : v));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
