import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const resources = [
  "motorcycle",
  "order",
  "reservation",
  "payment",
  "installment",
  "letter",
  "customer",
  "supplier",
  "purchase",
  "transfer",
  "branch",
  "user",
  "role",
  "report",
  "setting",
  "web_content",
] as const;

const actions = ["create", "read", "update", "delete", "export", "confirm"] as const;

const superAdminPermissions = resources.flatMap((resource) =>
  actions.map((action) => ({ resource, action })),
);

const customerPermissions = [
  { resource: "motorcycle", action: "read" },
  { resource: "order", action: "create" },
  { resource: "order", action: "read" },
  { resource: "reservation", action: "create" },
  { resource: "reservation", action: "read" },
  { resource: "payment", action: "read" },
  { resource: "installment", action: "read" },
  { resource: "letter", action: "read" },
  { resource: "customer", action: "read" },
  { resource: "customer", action: "update" },
] as const;

async function upsertRole(
  name: string,
  description: string,
  isSystem: boolean,
  permissions: readonly { resource: string; action: string }[],
) {
  const role = await prisma.role.upsert({
    where: { name },
    update: { description, isSystem },
    create: { name, description, isSystem },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: role.id,
      resource: permission.resource,
      action: permission.action,
    })),
    skipDuplicates: true,
  });

  return role;
}

export async function seedDatabase() {
  // Create branches
  const defaultBranch = await prisma.branch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      nameAr: "الفرع الرئيسي",
      nameEn: "Main Branch",
      address: "Default branch",
      phone: "+966000000000",
      isActive: true,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      nameAr: "الفرع الرئيسي",
      nameEn: "Main Branch",
      address: "Default branch",
      phone: "+966000000000",
    },
  });

  const secondBranch = await prisma.branch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {
      nameAr: "فرع الشمال",
      nameEn: "North Branch",
      address: "North district",
      phone: "+966111111111",
      isActive: true,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      nameAr: "فرع الشمال", 
      nameEn: "North Branch",
      address: "North district",
      phone: "+966111111111",
    },
  });

  // Create roles
  const superAdminRole = await upsertRole(
    "super_admin",
    "Full system access, including role management",
    true,
    superAdminPermissions,
  );

  await upsertRole(
    "customer",
    "E-commerce customer access to own data",
    true,
    customerPermissions,
  );

  // Branch Admin role
  const branchAdminPermissions = [
    ...resources.filter(r => r !== 'role' && r !== 'setting').flatMap((resource) =>
      actions.map((action) => ({ resource, action })),
    ),
    { resource: "configuration", action: "read" },
    { resource: "configuration", action: "update" },
    { resource: "report", action: "read" },
    { resource: "report", action: "export" },
  ] as const;

  await upsertRole(
    "branch_admin",
    "Branch administrator with full access to branch operations",
    true,
    branchAdminPermissions,
  );

  // Sales Staff role
  const salesStaffPermissions = [
    { resource: "motorcycle", action: "read" },
    { resource: "order", action: "create" },
    { resource: "order", action: "read" },
    { resource: "order", action: "update" },
    { resource: "reservation", action: "create" },
    { resource: "reservation", action: "read" },
    { resource: "reservation", action: "update" },
    { resource: "payment", action: "create" },
    { resource: "payment", action: "read" },
    { resource: "installment", action: "create" },
    { resource: "installment", action: "read" },
    { resource: "installment", action: "update" },
    { resource: "customer", action: "create" },
    { resource: "customer", action: "read" },
    { resource: "customer", action: "update" },
    { resource: "letter", action: "create" },
    { resource: "letter", action: "read" },
  ] as const;

  await upsertRole(
    "sales_staff",
    "Sales staff with access to customer operations and sales",
    true,
    salesStaffPermissions,
  );

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Super Admin",
      passwordHash,
      roleId: superAdminRole.id,
      branchId: null,
      lang: "en",
      isActive: true,
    },
    create: {
      name: "Super Admin",
      email: "admin@example.com",
      passwordHash,
      roleId: superAdminRole.id,
      branchId: null,
      lang: "en",
    },
  });

  // Create brands
  const brands = [
    {
      id: "10000000-0000-0000-0000-000000000001",
      nameAr: "هوندا",
      nameEn: "Honda",
      logo: "https://example.com/logos/honda.png",
      sortOrder: 1,
    },
    {
      id: "10000000-0000-0000-0000-000000000002", 
      nameAr: "ياماها",
      nameEn: "Yamaha",
      logo: "https://example.com/logos/yamaha.png",
      sortOrder: 2,
    },
    {
      id: "10000000-0000-0000-0000-000000000003",
      nameAr: "كاواساكي",
      nameEn: "Kawasaki", 
      logo: "https://example.com/logos/kawasaki.png",
      sortOrder: 3,
    },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { nameEn: brand.nameEn },
      update: { nameAr: brand.nameAr, logo: brand.logo, sortOrder: brand.sortOrder },
      create: brand,
    });
  }

  // Create categories
  const categories = [
    {
      id: "20000000-0000-0000-0000-000000000001",
      nameAr: "دراجات الشارع",
      nameEn: "Street Bikes",
      parentId: null,
      sortOrder: 1,
    },
    {
      id: "20000000-0000-0000-0000-000000000002",
      nameAr: "دراجات رياضية",
      nameEn: "Sport Bikes",
      parentId: "20000000-0000-0000-0000-000000000001",
      sortOrder: 1,
    },
    {
      id: "20000000-0000-0000-0000-000000000003",
      nameAr: "دراجات الطرق",
      nameEn: "Touring Bikes",
      parentId: "20000000-0000-0000-0000-000000000001",
      sortOrder: 2,
    },
    {
      id: "20000000-0000-0000-0000-000000000004",
      nameAr: "دراجات الطرق الوعرة",
      nameEn: "Off-Road Bikes", 
      parentId: null,
      sortOrder: 2,
    },
    {
      id: "20000000-0000-0000-0000-000000000005",
      nameAr: "دراجات الكروس",
      nameEn: "Motocross Bikes",
      parentId: "20000000-0000-0000-0000-000000000004",
      sortOrder: 1,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: category,
      create: category,
    });
  }

  // Create motorcycles
  const motorcycles = [
    // Main Branch motorcycles
    {
      vin: "JH2RC5006MM000001",
      model: "CBR600RR",
      year: 2023,
      color: "Red",
      engineSize: "600cc",
      descriptionAr: "دراجة نارية رياضية عالية الأداء",
      descriptionEn: "High-performance sport motorcycle",
      price: 45000.00,
      costPrice: 38000.00,
      status: "available" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000001", // Honda
      categoryId: "20000000-0000-0000-0000-000000000002", // Sport Bikes
      images: JSON.stringify([
        "https://example.com/images/cbr600rr-red-1.jpg",
        "https://example.com/images/cbr600rr-red-2.jpg"
      ]),
    },
    {
      vin: "JH2RC5006MM000002",
      model: "CBR1000RR",
      year: 2023,
      color: "Black",
      engineSize: "1000cc",
      descriptionAr: "دراجة نارية رياضية فائقة",
      descriptionEn: "Super sport motorcycle",
      price: 65000.00,
      costPrice: 55000.00,
      status: "available" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000001", // Honda
      categoryId: "20000000-0000-0000-0000-000000000002", // Sport Bikes
      images: JSON.stringify([
        "https://example.com/images/cbr1000rr-black-1.jpg"
      ]),
    },
    {
      vin: "JYARN23E0MA000001",
      model: "YZF-R3",
      year: 2023,
      color: "Blue",
      engineSize: "321cc",
      descriptionAr: "دراجة نارية رياضية للمبتدئين",
      descriptionEn: "Entry-level sport motorcycle",
      price: 25000.00,
      costPrice: 21000.00,
      status: "available" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000002", // Yamaha
      categoryId: "20000000-0000-0000-0000-000000000002", // Sport Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JYARN23E0MA000002",
      model: "MT-07",
      year: 2023,
      color: "Gray",
      engineSize: "689cc",
      descriptionAr: "دراجة نارية متعددة الاستخدامات",
      descriptionEn: "Versatile naked bike",
      price: 35000.00,
      costPrice: 29000.00,
      status: "reserved" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000002", // Yamaha
      categoryId: "20000000-0000-0000-0000-000000000001", // Street Bikes
      images: JSON.stringify([
        "https://example.com/images/mt07-gray-1.jpg",
        "https://example.com/images/mt07-gray-2.jpg",
        "https://example.com/images/mt07-gray-3.jpg"
      ]),
    },
    {
      vin: "JKBZXN23A0A000001",
      model: "Ninja 400",
      year: 2023,
      color: "Green",
      engineSize: "399cc",
      descriptionAr: "دراجة نارية رياضية متوسطة",
      descriptionEn: "Mid-range sport motorcycle",
      price: 28000.00,
      costPrice: 23500.00,
      status: "available" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000003", // Kawasaki
      categoryId: "20000000-0000-0000-0000-000000000002", // Sport Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JKBZXN23A0A000002",
      model: "KX250F",
      year: 2023,
      color: "Green",
      engineSize: "249cc",
      descriptionAr: "دراجة موتوكروس احترافية",
      descriptionEn: "Professional motocross bike",
      price: 32000.00,
      costPrice: 27000.00,
      status: "available" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000003", // Kawasaki
      categoryId: "20000000-0000-0000-0000-000000000005", // Motocross Bikes
      images: JSON.stringify([
        "https://example.com/images/kx250f-green-1.jpg"
      ]),
    },
    {
      vin: "JH2RC5006MM000003",
      model: "Gold Wing",
      year: 2023,
      color: "Silver",
      engineSize: "1833cc",
      descriptionAr: "دراجة نارية للرحلات الطويلة",
      descriptionEn: "Long-distance touring motorcycle",
      price: 95000.00,
      costPrice: 82000.00,
      status: "available" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000001", // Honda
      categoryId: "20000000-0000-0000-0000-000000000003", // Touring Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JH2RC5006MM000004",
      model: "CRF450R",
      year: 2023,
      color: "Red",
      engineSize: "449cc",
      descriptionAr: "دراجة موتوكروس عالية الأداء",
      descriptionEn: "High-performance motocross bike",
      price: 38000.00,
      costPrice: 32000.00,
      status: "maintenance" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000001", // Honda
      categoryId: "20000000-0000-0000-0000-000000000005", // Motocross Bikes
      images: JSON.stringify([
        "https://example.com/images/crf450r-red-1.jpg",
        "https://example.com/images/crf450r-red-2.jpg"
      ]),
    },
    {
      vin: "JYARN23E0MA000003",
      model: "Tenere 700",
      year: 2023,
      color: "White",
      engineSize: "689cc",
      descriptionAr: "دراجة نارية للمغامرات",
      descriptionEn: "Adventure motorcycle",
      price: 42000.00,
      costPrice: 36000.00,
      status: "sold" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000002", // Yamaha
      categoryId: "20000000-0000-0000-0000-000000000004", // Off-Road Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JKBZXN23A0A000003",
      model: "Z900",
      year: 2022,
      color: "Black",
      engineSize: "948cc",
      descriptionAr: "دراجة نارية قوية للشارع",
      descriptionEn: "Powerful street motorcycle",
      price: 48000.00,
      costPrice: 41000.00,
      status: "available" as const,
      branchId: defaultBranch.id,
      brandId: "10000000-0000-0000-0000-000000000003", // Kawasaki
      categoryId: "20000000-0000-0000-0000-000000000001", // Street Bikes
      images: JSON.stringify([
        "https://example.com/images/z900-black-1.jpg"
      ]),
    },
    // North Branch motorcycles  
    {
      vin: "JH2RC5006MM000005",
      model: "CBR500R",
      year: 2023,
      color: "Orange",
      engineSize: "471cc",
      descriptionAr: "دراجة نارية رياضية متوسطة",
      descriptionEn: "Mid-level sport motorcycle",
      price: 32000.00,
      costPrice: 27500.00,
      status: "available" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000001", // Honda
      categoryId: "20000000-0000-0000-0000-000000000002", // Sport Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JYARN23E0MA000004",
      model: "YZF-R1",
      year: 2023,
      color: "Blue",
      engineSize: "998cc",
      descriptionAr: "دراجة نارية رياضية فائقة الأداء",
      descriptionEn: "Ultra-high-performance sport bike",
      price: 72000.00,
      costPrice: 62000.00,
      status: "available" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000002", // Yamaha
      categoryId: "20000000-0000-0000-0000-000000000002", // Sport Bikes
      images: JSON.stringify([
        "https://example.com/images/r1-blue-1.jpg",
        "https://example.com/images/r1-blue-2.jpg"
      ]),
    },
    {
      vin: "JKBZXN23A0A000004",
      model: "Ninja ZX-10R",
      year: 2023,
      color: "Green",
      engineSize: "998cc",
      descriptionAr: "دراجة نارية رياضية للسباق",
      descriptionEn: "Racing sport motorcycle",
      price: 68000.00,
      costPrice: 58000.00,
      status: "in_transit" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000003", // Kawasaki
      categoryId: "20000000-0000-0000-0000-000000000002", // Sport Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JH2RC5006MM000006",
      model: "Rebel 500",
      year: 2023,
      color: "Black",
      engineSize: "471cc",
      descriptionAr: "دراجة نارية كروزر",
      descriptionEn: "Cruiser motorcycle", 
      price: 29000.00,
      costPrice: 24500.00,
      status: "available" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000001", // Honda
      categoryId: "20000000-0000-0000-0000-000000000001", // Street Bikes
      images: JSON.stringify([
        "https://example.com/images/rebel500-black-1.jpg"
      ]),
    },
    {
      vin: "JYARN23E0MA000005",
      model: "MT-09",
      year: 2022,
      color: "Gray",
      engineSize: "847cc",
      descriptionAr: "دراجة نارية قوية ومرنة",
      descriptionEn: "Powerful and agile naked bike",
      price: 42000.00,
      costPrice: 36500.00,
      status: "reserved" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000002", // Yamaha
      categoryId: "20000000-0000-0000-0000-000000000001", // Street Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JKBZXN23A0A000005",
      model: "Versys 650",
      year: 2023,
      color: "White",
      engineSize: "649cc",
      descriptionAr: "دراجة نارية للمغامرات والرحلات",
      descriptionEn: "Adventure touring motorcycle",
      price: 39000.00,
      costPrice: 33000.00,
      status: "available" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000003", // Kawasaki
      categoryId: "20000000-0000-0000-0000-000000000004", // Off-Road Bikes
      images: JSON.stringify([
        "https://example.com/images/versys650-white-1.jpg",
        "https://example.com/images/versys650-white-2.jpg"
      ]),
    },
    {
      vin: "JH2RC5006MM000007",
      model: "Africa Twin",
      year: 2023,
      color: "Red",
      engineSize: "1084cc",
      descriptionAr: "دراجة نارية للمغامرات الكبيرة",
      descriptionEn: "Big adventure motorcycle",
      price: 58000.00,
      costPrice: 50000.00,
      status: "available" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000001", // Honda
      categoryId: "20000000-0000-0000-0000-000000000004", // Off-Road Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JYARN23E0MA000006",
      model: "WR250F",
      year: 2023,
      color: "Blue",
      engineSize: "250cc",
      descriptionAr: "دراجة نارية للطرق الوعرة",
      descriptionEn: "Off-road motorcycle",
      price: 26000.00,
      costPrice: 22000.00,
      status: "available" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000002", // Yamaha
      categoryId: "20000000-0000-0000-0000-000000000004", // Off-Road Bikes
      images: JSON.stringify([
        "https://example.com/images/wr250f-blue-1.jpg"
      ]),
    },
    {
      vin: "JKBZXN23A0A000006",
      model: "KLX300R",
      year: 2023,
      color: "Green",
      engineSize: "292cc",
      descriptionAr: "دراجة نارية للاستخدام المختلط",
      descriptionEn: "Dual-purpose motorcycle",
      price: 24000.00,
      costPrice: 20500.00,
      status: "in_transfer" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000003", // Kawasaki
      categoryId: "20000000-0000-0000-0000-000000000004", // Off-Road Bikes
      images: JSON.stringify([]),
    },
    {
      vin: "JH2RC5006MM000008",
      model: "Grom",
      year: 2023,
      color: "Yellow",
      engineSize: "125cc",
      descriptionAr: "دراجة نارية صغيرة وممتعة",
      descriptionEn: "Small and fun motorcycle",
      price: 15000.00,
      costPrice: 12500.00,
      status: "returned" as const,
      branchId: secondBranch.id,
      brandId: "10000000-0000-0000-0000-000000000001", // Honda
      categoryId: "20000000-0000-0000-0000-000000000001", // Street Bikes
      images: JSON.stringify([
        "https://example.com/images/grom-yellow-1.jpg",
        "https://example.com/images/grom-yellow-2.jpg"
      ]),
    },
  ];

  // Fetch actual brand and category IDs (may differ from hardcoded if seed was re-run)
  const [hondaDb, yamahaDb, kawasakiDb] = await Promise.all([
    prisma.brand.findFirst({ where: { nameEn: "Honda" }, select: { id: true } }),
    prisma.brand.findFirst({ where: { nameEn: "Yamaha" }, select: { id: true } }),
    prisma.brand.findFirst({ where: { nameEn: "Kawasaki" }, select: { id: true } }),
  ]);

  const [streetDb, sportDb, touringDb, offRoadDb, motocrossDb] = await Promise.all([
    prisma.category.findFirst({ where: { nameEn: "Street Bikes" }, select: { id: true } }),
    prisma.category.findFirst({ where: { nameEn: "Sport Bikes" }, select: { id: true } }),
    prisma.category.findFirst({ where: { nameEn: "Touring Bikes" }, select: { id: true } }),
    prisma.category.findFirst({ where: { nameEn: "Off-Road Bikes" }, select: { id: true } }),
    prisma.category.findFirst({ where: { nameEn: "Motocross Bikes" }, select: { id: true } }),
  ]);

  const missingCatalogRecords = [
    ["brand", "Honda", hondaDb],
    ["brand", "Yamaha", yamahaDb],
    ["brand", "Kawasaki", kawasakiDb],
    ["category", "Street Bikes", streetDb],
    ["category", "Sport Bikes", sportDb],
    ["category", "Touring Bikes", touringDb],
    ["category", "Off-Road Bikes", offRoadDb],
    ["category", "Motocross Bikes", motocrossDb],
  ].filter(([, , record]) => !record);

  if (missingCatalogRecords.length > 0) {
    throw new Error(
      `Expected seeded catalog record(s) before motorcycles: ${missingCatalogRecords.map(([type, name]) => `${type} "${name}"`).join(", ")}`,
    );
  }

  const brandMap: Record<string, string> = {
    "10000000-0000-0000-0000-000000000001": hondaDb.id,
    "10000000-0000-0000-0000-000000000002": yamahaDb.id,
    "10000000-0000-0000-0000-000000000003": kawasakiDb.id,
  };
  const catMap: Record<string, string> = {
    "20000000-0000-0000-0000-000000000001": streetDb.id,
    "20000000-0000-0000-0000-000000000002": sportDb.id,
    "20000000-0000-0000-0000-000000000003": touringDb.id,
    "20000000-0000-0000-0000-000000000004": offRoadDb.id,
    "20000000-0000-0000-0000-000000000005": motocrossDb.id,
  };

  for (const motorcycle of motorcycles) {
    const moto = {
      ...motorcycle,
      brandId: brandMap[motorcycle.brandId] ?? motorcycle.brandId,
      categoryId: catMap[motorcycle.categoryId] ?? motorcycle.categoryId,
    };
    await prisma.motorcycle.upsert({
      where: { vin: moto.vin },
      update: moto,
      create: moto,
    });
  }

  // Create customers with addresses
  const customers = await createCustomers();

  return { defaultBranch, secondBranch, superAdminRole, customers };
}

async function createCustomers() {
  const customersData = [
    // Customers with email (e-commerce users)
    {
      name: "أحمد محمد الأحمد",
      phone: "+966501234567",
      email: "ahmed@example.com",
      passwordHash: await bcrypt.hash("customer123", 10),
      nationalId: "1234567890",
      notes: "عميل مميز",
      addresses: [
        {
          label: "المنزل",
          addressLine: "شارع الملك فهد، حي الملز",
          city: "الرياض",
          region: "منطقة الرياض",
          postalCode: "12345",
          isDefault: true,
        },
        {
          label: "العمل",
          addressLine: "طريق الملك عبدالعزيز، حي العليا",
          city: "الرياض", 
          region: "منطقة الرياض",
          postalCode: "11564",
          isDefault: false,
        }
      ]
    },
    {
      name: "فاطمة علي السعيد",
      phone: "+966502345678",
      email: "fatima@example.com",
      passwordHash: await bcrypt.hash("customer123", 10),
      nationalId: "2345678901",
      addresses: [
        {
          label: "Home",
          addressLine: "Prince Sultan Street, Al-Khobar",
          city: "Al-Khobar",
          region: "Eastern Province",
          postalCode: "31952",
          isDefault: true,
        }
      ]
    },
    {
      name: "Mohammed Hassan Al-Rashid",
      phone: "+966503456789", 
      email: "mohammed@example.com",
      passwordHash: await bcrypt.hash("customer123", 10),
      nationalId: "3456789012",
      addresses: [
        {
          label: "Villa",
          addressLine: "King Abdullah Road, Jeddah",
          city: "Jeddah",
          region: "Makkah Province",
          postalCode: "23214",
          isDefault: true,
        }
      ]
    },
    {
      name: "سارة عبدالرحمن القحطاني",
      phone: "+966504567890",
      email: "sara@example.com",
      passwordHash: await bcrypt.hash("customer123", 10),
      nationalId: "4567890123",
      addresses: [
        {
          label: "الشقة",
          addressLine: "شارع التحلية، حي المحمدية",
          city: "جدة",
          region: "منطقة مكة المكرمة",
          postalCode: "23323",
          isDefault: true,
        }
      ]
    },
    {
      name: "خالد عبدالله النصر",
      phone: "+966505678901",
      email: "khaled@example.com", 
      passwordHash: await bcrypt.hash("customer123", 10),
      nationalId: "5678901234",
      addresses: [
        {
          label: "المنزل",
          addressLine: "طريق الأمير محمد بن عبدالعزيز، حي الربيع",
          city: "الدمام",
          region: "المنطقة الشرقية",
          postalCode: "32214",
          isDefault: true,
        }
      ]
    },
    // POS customers (no email, no password)
    {
      name: "عبدالعزيز صالح الغامدي",
      phone: "+966506789012",
      email: null,
      passwordHash: null,
      nationalId: "6789012345",
      notes: "عميل نقدي - زيارة أولى",
      addresses: [
        {
          label: "المنزل",
          addressLine: "حي النسيم، الطائف",
          city: "الطائف",
          region: "منطقة مكة المكرمة",
          postalCode: "26571",
          isDefault: true,
        }
      ]
    },
    {
      name: "مريم أحمد البلوي",
      phone: "+966507890123",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: [
        {
          label: "Home",
          addressLine: "Al-Hamra District, Tabuk",
          city: "Tabuk",
          region: "Tabuk Province", 
          postalCode: "47311",
          isDefault: true,
        }
      ]
    },
    {
      name: "سلطان محمد الشهري",
      phone: "+966508901234",
      email: null,
      passwordHash: null,
      nationalId: "8901234567",
      addresses: []
    },
    {
      name: "نوف عبدالله الزهراني",
      phone: "+966509012345",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: [
        {
          label: "Villa",
          addressLine: "King Faisal Street, Abha",
          city: "Abha", 
          region: "Asir Province",
          postalCode: "61961",
          isDefault: true,
        }
      ]
    },
    {
      name: "راشد سعد العتيبي",
      phone: "+966510123456",
      email: null,
      passwordHash: null,
      nationalId: "0123456789",
      addresses: [
        {
          label: "المحل",
          addressLine: "السوق التجاري، حائل",
          city: "حائل",
          region: "منطقة حائل",
          postalCode: "55425",
          isDefault: true,
        }
      ]
    },
    // More customers without email
    {
      name: "عائشة محمد الدوسري",
      phone: "+966511234567",
      email: null,
      passwordHash: null,
      nationalId: "1122334455",
      addresses: []
    },
    {
      name: "فهد عبدالرحمن المطيري",
      phone: "+966512345678",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: [
        {
          label: "Home",
          addressLine: "Industrial Area, Jubail",
          city: "Jubail",
          region: "Eastern Province",
          postalCode: "35517",
          isDefault: true,
        }
      ]
    },
    {
      name: "لطيفة أحمد الحربي",
      phone: "+966513456789",
      email: null,
      passwordHash: null,
      nationalId: "2233445566",
      addresses: [
        {
          label: "المنزل",
          addressLine: "حي الياسمين، بريدة",
          city: "بريدة",
          region: "منطقة القصيم",
          postalCode: "51911",
          isDefault: true,
        }
      ]
    },
    {
      name: "طلال سليمان القرني",
      phone: "+966514567890",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: []
    },
    {
      name: "هند محمد العنزي",
      phone: "+966515678901",
      email: null,
      passwordHash: null,
      nationalId: "3344556677",
      addresses: [
        {
          label: "Apartment",
          addressLine: "Al-Nakheel District, Arar",
          city: "Arar",
          region: "Northern Borders Province",
          postalCode: "73241",
          isDefault: true,
        }
      ]
    },
    {
      name: "ماجد عبدالله الشمري",
      phone: "+966516789012",
      email: null,
      passwordHash: null,
      nationalId: "4455667788",
      addresses: [
        {
          label: "المكتب",
          addressLine: "شارع الملك خالد، سكاكا",
          city: "سكاكا",
          region: "منطقة الجوف",
          postalCode: "42421",
          isDefault: true,
        }
      ]
    },
    {
      name: "أمل صالح الغامدي",
      phone: "+966517890123",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: []
    },
    {
      name: "حسام محمد الجهني",
      phone: "+966518901234",
      email: null,
      passwordHash: null,
      nationalId: "5566778899",
      addresses: [
        {
          label: "House",
          addressLine: "Al-Balad, Medina",
          city: "Medina",
          region: "Medina Province",
          postalCode: "42311",
          isDefault: true,
        }
      ]
    },
    {
      name: "سمية عبدالعزيز الرشيد",
      phone: "+966519012345",
      email: null,
      passwordHash: null,
      nationalId: "6677889900",
      addresses: [
        {
          label: "الفيلا",
          addressLine: "حي الحمراء، ينبع",
          city: "ينبع",
          region: "منطقة المدينة المنورة",
          postalCode: "46423",
          isDefault: true,
        }
      ]
    },
    {
      name: "عمر أحمد البقمي",
      phone: "+966520123456",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: []
    },
    // Additional customers to reach 50+
    {
      name: "ريما سعد العسيري",
      phone: "+966521234567",
      email: null,
      passwordHash: null,
      nationalId: "7788990011",
      addresses: [
        {
          label: "Home",
          addressLine: "King Abdulaziz Road, Khamis Mushait",
          city: "Khamis Mushait",
          region: "Asir Province",
          postalCode: "62431",
          isDefault: true,
        }
      ]
    },
    {
      name: "يوسف محمد الزهراني",
      phone: "+966522345678",
      email: null,
      passwordHash: null,
      nationalId: "8899001122",
      addresses: [
        {
          label: "المنزل",
          addressLine: "حي الفيحاء، الباحة",
          city: "الباحة",
          region: "منطقة الباحة",
          postalCode: "65311",
          isDefault: true,
        }
      ]
    },
    {
      name: "جواهر عبدالله الحكمي",
      phone: "+966523456789",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: []
    },
    {
      name: "عادل صالح القريني",
      phone: "+966524567890",
      email: null,
      passwordHash: null,
      nationalId: "9900112233",
      addresses: [
        {
          label: "Office",
          addressLine: "Business District, Najran",
          city: "Najran",
          region: "Najran Province",
          postalCode: "68311",
          isDefault: true,
        }
      ]
    },
    {
      name: "شريفة محمد الأحمدي",
      phone: "+966525678901",
      email: null,
      passwordHash: null,
      nationalId: "0011223344",
      addresses: [
        {
          label: "المنزل",
          addressLine: "حي الشفاء، مكة المكرمة",
          city: "مكة المكرمة",
          region: "منطقة مكة المكرمة",
          postalCode: "24231",
          isDefault: true,
        }
      ]
    },
    {
      name: "حمد عبدالرحمن الدوسري",
      phone: "+966526789012",
      email: null,
      passwordHash: null,
      nationalId: "1122334456",
      addresses: []
    },
    {
      name: "منيرة أحمد العتيبي",
      phone: "+966527890123",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: [
        {
          label: "Villa",
          addressLine: "Al-Rawdah District, Riyadh",
          city: "Riyadh",
          region: "Riyadh Province",
          postalCode: "13211",
          isDefault: true,
        }
      ]
    },
    {
      name: "بدر سليمان المالكي",
      phone: "+966528901234",
      email: null,
      passwordHash: null,
      nationalId: "2233445567",
      addresses: [
        {
          label: "المكتب",
          addressLine: "شارع الأمير سلطان، الخرج",
          city: "الخرج",
          region: "منطقة الرياض",
          postalCode: "16212",
          isDefault: true,
        }
      ]
    },
    {
      name: "وفاء محمد الشهري",
      phone: "+966529012345",
      email: null,
      passwordHash: null,
      nationalId: "3344556678",
      addresses: []
    },
    {
      name: "سعود عبدالله النعيمي",
      phone: "+966530123456",
      email: null,
      passwordHash: null,
      nationalId: "4455667789",
      addresses: [
        {
          label: "Home",
          addressLine: "Industrial City, Dammam",
          city: "Dammam",
          region: "Eastern Province",
          postalCode: "32233",
          isDefault: true,
        }
      ]
    },
    // More customers to reach 50+
    {
      name: "نادية صالح الغامدي",
      phone: "+966531234567",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: [
        {
          label: "الشقة",
          addressLine: "حي السلامة، الطائف",
          city: "الطائف",
          region: "منطقة مكة المكرمة",
          postalCode: "26522",
          isDefault: true,
        }
      ]
    },
    {
      name: "علي محمد الحارثي",
      phone: "+966532345678",
      email: null,
      passwordHash: null,
      nationalId: "5566778890",
      addresses: []
    },
    {
      name: "هيفاء عبدالرحمن الشمري",
      phone: "+966533456789",
      email: null,
      passwordHash: null,
      nationalId: "6677889901",
      addresses: [
        {
          label: "House",
          addressLine: "Al-Quds Street, Hail",
          city: "Hail",
          region: "Hail Province",
          postalCode: "55471",
          isDefault: true,
        }
      ]
    },
    {
      name: "إبراهيم أحمد المطيري",
      phone: "+966534567890",
      email: null,
      passwordHash: null,
      nationalId: "7788990012",
      addresses: [
        {
          label: "المنزل",
          addressLine: "حي الأندلس، الرياض",
          city: "الرياض",
          region: "منطقة الرياض",
          postalCode: "13326",
          isDefault: true,
        }
      ]
    },
    {
      name: "زينب محمد البلوي",
      phone: "+966535678901",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: []
    },
    {
      name: "عبدالملك سعد العنزي",
      phone: "+966536789012",
      email: null,
      passwordHash: null,
      nationalId: "8899001123",
      addresses: [
        {
          label: "Office",
          addressLine: "Commercial Center, Tabuk",
          city: "Tabuk", 
          region: "Tabuk Province",
          postalCode: "47322",
          isDefault: true,
        }
      ]
    },
    {
      name: "رانيا عبدالله الصالح",
      phone: "+966537890123",
      email: null,
      passwordHash: null,
      nationalId: "9900112234",
      addresses: [
        {
          label: "الفيلا",
          addressLine: "حي العزيزية، الخبر",
          city: "الخبر",
          region: "المنطقة الشرقية",
          postalCode: "31982",
          isDefault: true,
        }
      ]
    },
    {
      name: "فيصل محمد الحربي",
      phone: "+966538901234",
      email: null,
      passwordHash: null,
      nationalId: "0011223345",
      addresses: []
    },
    {
      name: "سلمى أحمد الغامدي",
      phone: "+966539012345",
      email: null,
      passwordHash: null,
      nationalId: "1122334457",
      addresses: [
        {
          label: "Home",
          addressLine: "Al-Aziziyah District, Jeddah",
          city: "Jeddah",
          region: "Makkah Province", 
          postalCode: "23334",
          isDefault: true,
        }
      ]
    },
    {
      name: "تركي عبدالرحمن القحطاني",
      phone: "+966540123456",
      email: null,
      passwordHash: null,
      nationalId: "2233445568",
      addresses: [
        {
          label: "المكتب",
          addressLine: "شارع الملك فيصل، أبها",
          city: "أبها",
          region: "منطقة عسير",
          postalCode: "62521",
          isDefault: true,
        }
      ]
    },
    // Additional customers to ensure we have 50+
    {
      name: "لينا محمد الجهني",
      phone: "+966541234567",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: []
    },
    {
      name: "عثمان صالح الدوسري",
      phone: "+966542345678", 
      email: null,
      passwordHash: null,
      nationalId: "3344556679",
      addresses: [
        {
          label: "Villa",
          addressLine: "King Salman Road, Buraidah",
          city: "Buraidah",
          region: "Qassim Province",
          postalCode: "51932",
          isDefault: true,
        }
      ]
    },
    {
      name: "دلال عبدالله العسيري",
      phone: "+966543456789",
      email: null,
      passwordHash: null,
      nationalId: "4455667780",
      addresses: [
        {
          label: "المنزل",
          addressLine: "حي المروج، خميس مشيط",
          city: "خميس مشيط",
          region: "منطقة عسير",
          postalCode: "62462",
          isDefault: true,
        }
      ]
    },
    {
      name: "مشعل أحمد الشهري",
      phone: "+966544567890",
      email: null,
      passwordHash: null,
      nationalId: "5566778891",
      addresses: []
    },
    {
      name: "غادة محمد الرشيد",
      phone: "+966545678901",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: [
        {
          label: "Apartment",
          addressLine: "Al-Malqa District, Riyadh",
          city: "Riyadh",
          region: "Riyadh Province", 
          postalCode: "13521",
          isDefault: true,
        }
      ]
    },
    {
      name: "عبدالحميد سليمان العتيبي",
      phone: "+966546789012",
      email: null,
      passwordHash: null,
      nationalId: "6677889902",
      addresses: [
        {
          label: "المحل",
          addressLine: "السوق المركزي، الدمام",
          city: "الدمام",
          region: "المنطقة الشرقية",
          postalCode: "32245",
          isDefault: true,
        }
      ]
    },
    {
      name: "إيمان عبدالرحمن الحكمي",
      phone: "+966547890123",
      email: null,
      passwordHash: null,
      nationalId: "7788990013",
      addresses: []
    },
    {
      name: "بندر محمد المالكي",
      phone: "+966548901234",
      email: null,
      passwordHash: null,
      nationalId: "8899001124",
      addresses: [
        {
          label: "House",
          addressLine: "Prince Mohammed Street, Jazan",
          city: "Jazan",
          region: "Jazan Province",
          postalCode: "82621",
          isDefault: true,
        }
      ]
    },
    {
      name: "نهى أحمد الغامدي",
      phone: "+966549012345",
      email: null,
      passwordHash: null,
      nationalId: "9900112235",
      addresses: [
        {
          label: "الفيلا",
          addressLine: "حي الواحة، الطائف",
          city: "الطائف",
          region: "منطقة مكة المكرمة",
          postalCode: "26531",
          isDefault: true,
        }
      ]
    },
    {
      name: "سطام عبدالله الشمري",
      phone: "+966550123456",
      email: null,
      passwordHash: null,
      nationalId: null,
      addresses: []
    }
  ];

  const createdCustomers = [];

  for (const customerData of customersData) {
    const { addresses, ...customerInfo } = customerData;
    
    const customer = await prisma.customer.upsert({
      where: { phone: customerInfo.phone },
      update: customerInfo,
      create: customerInfo,
    });

    // Create addresses for this customer
    const existingAddresses = await prisma.address.findMany({
      where: { customerId: customer.id }
    });
    
    if (existingAddresses.length === 0) {
      for (const addressData of addresses) {
        await prisma.address.create({
          data: {
            ...addressData,
            customerId: customer.id,
          },
        });
      }
    }

    createdCustomers.push(customer);
  }

  console.log(`✅ Created ${createdCustomers.length} customers with addresses`);
  return createdCustomers;
}

async function seedReservations() {
  // Fetch prerequisite records seeded above
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  if (!adminUser) throw new Error("Admin user not found — run seedDatabase first");

  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });
  const mainBranch = branches[0];
  const northBranch = branches[1] ?? branches[0];

  // Use motorcycles with known VINs from seedDatabase
  const mainBikeVins = [
    "JKBZXN23A0A000001", // Ninja 400 - available
    "JKBZXN23A0A000002", // KX250F - available
    "JH2RC5006MM000003", // Gold Wing - available
    "JKBZXN23A0A000003", // Z900 - available
    "JKBZXN23A0A000002", // KX250F again — deduplicated below
  ];
  const northBikeVins = [
    "JH2RC5006MM000005", // CBR500R - available
    "JYARN23E0MA000004", // YZF-R1 - available
    "JH2RC5006MM000006", // Rebel 500 - available
    "JYARN23E0MA000005", // MT-09 - reserved
    "JKBZXN23A0A000005", // Versys 650 - available
    "JH2RC5006MM000007", // Africa Twin - available
    "JYARN23E0MA000006", // WR250F - available
  ];

  const allVins = [...new Set([...mainBikeVins, ...northBikeVins])];
  const motorcycles = await prisma.motorcycle.findMany({ where: { vin: { in: allVins } } });
  const motoMap = new Map(motorcycles.map((m) => [m.vin, m]));

  const customers = await prisma.customer.findMany({ take: 10, orderBy: { createdAt: "asc" } });
  if (customers.length < 3) throw new Error("Need at least 3 customers — run seedDatabase first");

  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  type ResStatus = "active" | "converted" | "expired" | "cancelled";

  interface ReservationSeed {
    reservationNumber: string;
    customerId: string;
    motorcycleVin: string;
    branchId: string;
    userId: string;
    status: ResStatus;
    totalPrice: number;
    paidAmount: number;
    expiresAt: Date | null;
    notes: string | null;
  }

  const reservationSeeds: ReservationSeed[] = [
    // === ACTIVE reservations (main branch) ===
    {
      reservationNumber: "RES-MAN-2026-00001",
      customerId: customers[0].id,
      motorcycleVin: "JKBZXN23A0A000001", // Ninja 400
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 28000,
      paidAmount: 5000,
      expiresAt: daysFromNow(5),
      notes: "عميل جاد في الشراء",
    },
    {
      reservationNumber: "RES-MAN-2026-00002",
      customerId: customers[1].id,
      motorcycleVin: "JKBZXN23A0A000002", // KX250F
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 32000,
      paidAmount: 8000,
      expiresAt: daysFromNow(3), // near expiry
      notes: null,
    },
    {
      reservationNumber: "RES-MAN-2026-00003",
      customerId: customers[2].id,
      motorcycleVin: "JH2RC5006MM000003", // Gold Wing
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 95000,
      paidAmount: 20000,
      expiresAt: daysFromNow(1), // expires tomorrow — near expiry
      notes: "يريد استلام الدراجة آخر الشهر",
    },
    {
      reservationNumber: "RES-MAN-2026-00004",
      customerId: customers[3 % customers.length].id,
      motorcycleVin: "JKBZXN23A0A000003", // Z900
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 48000,
      paidAmount: 10000,
      expiresAt: daysFromNow(14),
      notes: null,
    },
    // === ACTIVE reservations (north branch) ===
    {
      reservationNumber: "RES-NOR-2026-00001",
      customerId: customers[4 % customers.length].id,
      motorcycleVin: "JH2RC5006MM000005", // CBR500R
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 32000,
      paidAmount: 5000,
      expiresAt: daysFromNow(7),
      notes: null,
    },
    {
      reservationNumber: "RES-NOR-2026-00002",
      customerId: customers[5 % customers.length].id,
      motorcycleVin: "JYARN23E0MA000004", // YZF-R1
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 72000,
      paidAmount: 15000,
      expiresAt: daysFromNow(2), // near expiry
      notes: "العميل سيدفع المبلغ كاملاً خلال يومين",
    },
    {
      reservationNumber: "RES-NOR-2026-00003",
      customerId: customers[6 % customers.length].id,
      motorcycleVin: "JH2RC5006MM000006", // Rebel 500
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 29000,
      paidAmount: 3000,
      expiresAt: daysFromNow(10),
      notes: null,
    },
    {
      reservationNumber: "RES-NOR-2026-00004",
      customerId: customers[7 % customers.length].id,
      motorcycleVin: "JKBZXN23A0A000005", // Versys 650
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 39000,
      paidAmount: 10000,
      expiresAt: daysFromNow(0), // expires today
      notes: "يجب متابعة العميل اليوم",
    },
    {
      reservationNumber: "RES-NOR-2026-00005",
      customerId: customers[8 % customers.length].id,
      motorcycleVin: "JH2RC5006MM000007", // Africa Twin
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 58000,
      paidAmount: 12000,
      expiresAt: daysFromNow(20),
      notes: null,
    },
    {
      reservationNumber: "RES-NOR-2026-00006",
      customerId: customers[9 % customers.length].id,
      motorcycleVin: "JYARN23E0MA000006", // WR250F
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "active",
      totalPrice: 26000,
      paidAmount: 5000,
      expiresAt: daysFromNow(30),
      notes: null,
    },
    // === EXPIRED reservations ===
    {
      reservationNumber: "RES-MAN-2025-00001",
      customerId: customers[0].id,
      motorcycleVin: "JKBZXN23A0A000001",
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "expired",
      totalPrice: 28000,
      paidAmount: 3000,
      expiresAt: daysAgo(5),
      notes: "انتهى الحجز ولم يتم الدفع",
    },
    {
      reservationNumber: "RES-NOR-2025-00001",
      customerId: customers[1].id,
      motorcycleVin: "JH2RC5006MM000005",
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "expired",
      totalPrice: 32000,
      paidAmount: 2000,
      expiresAt: daysAgo(10),
      notes: null,
    },
    {
      reservationNumber: "RES-MAN-2025-00002",
      customerId: customers[2].id,
      motorcycleVin: "JKBZXN23A0A000002",
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "expired",
      totalPrice: 32000,
      paidAmount: 5000,
      expiresAt: daysAgo(3),
      notes: "تم إبلاغ العميل",
    },
    // === CANCELLED reservations ===
    {
      reservationNumber: "RES-MAN-2025-00003",
      customerId: customers[3 % customers.length].id,
      motorcycleVin: "JH2RC5006MM000003",
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "cancelled",
      totalPrice: 95000,
      paidAmount: 10000,
      expiresAt: daysFromNow(7),
      notes: "العميل ألغى الطلب بسبب تغيير الرأي",
    },
    {
      reservationNumber: "RES-NOR-2025-00002",
      customerId: customers[4 % customers.length].id,
      motorcycleVin: "JYARN23E0MA000004",
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "cancelled",
      totalPrice: 72000,
      paidAmount: 0,
      expiresAt: daysFromNow(5),
      notes: null,
    },
    {
      reservationNumber: "RES-MAN-2025-00004",
      customerId: customers[5 % customers.length].id,
      motorcycleVin: "JKBZXN23A0A000003",
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "cancelled",
      totalPrice: 48000,
      paidAmount: 5000,
      expiresAt: daysAgo(1),
      notes: "إلغاء بطلب العميل",
    },
    {
      reservationNumber: "RES-NOR-2025-00003",
      customerId: customers[6 % customers.length].id,
      motorcycleVin: "JH2RC5006MM000006",
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "cancelled",
      totalPrice: 29000,
      paidAmount: 2000,
      expiresAt: daysFromNow(3),
      notes: null,
    },
    // === CONVERTED reservations (no real order link — convertedOrderId null for seed) ===
    {
      reservationNumber: "RES-MAN-2025-00005",
      customerId: customers[7 % customers.length].id,
      motorcycleVin: "JKBZXN23A0A000001",
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "converted",
      totalPrice: 28000,
      paidAmount: 28000,
      expiresAt: daysAgo(20),
      notes: "تم التحويل إلى طلب شراء",
    },
    {
      reservationNumber: "RES-NOR-2025-00004",
      customerId: customers[8 % customers.length].id,
      motorcycleVin: "JH2RC5006MM000007",
      branchId: northBranch.id,
      userId: adminUser.id,
      status: "converted",
      totalPrice: 58000,
      paidAmount: 20000,
      expiresAt: daysAgo(15),
      notes: null,
    },
    {
      reservationNumber: "RES-MAN-2025-00006",
      customerId: customers[9 % customers.length].id,
      motorcycleVin: "JKBZXN23A0A000002",
      branchId: mainBranch.id,
      userId: adminUser.id,
      status: "converted",
      totalPrice: 32000,
      paidAmount: 10000,
      expiresAt: daysAgo(8),
      notes: "العميل دفع مبلغاً كبيراً كعربون",
    },
  ];

  let created = 0;
  for (const seed of reservationSeeds) {
    const motorcycle = motoMap.get(seed.motorcycleVin);
    if (!motorcycle) {
      console.warn(`⚠️  Motorcycle VIN ${seed.motorcycleVin} not found — skipping reservation ${seed.reservationNumber}`);
      continue;
    }

    const remainingAmount = seed.totalPrice - seed.paidAmount;

    await prisma.reservation.upsert({
      where: { reservationNumber: seed.reservationNumber },
      update: {
        status: seed.status as any,
        totalPrice: seed.totalPrice,
        paidAmount: seed.paidAmount,
        remainingAmount,
        expiresAt: seed.expiresAt,
        notes: seed.notes,
      },
      create: {
        reservationNumber: seed.reservationNumber,
        customerId: seed.customerId,
        motorcycleId: motorcycle.id,
        branchId: seed.branchId,
        userId: seed.userId,
        status: seed.status as any,
        totalPrice: seed.totalPrice,
        paidAmount: seed.paidAmount,
        remainingAmount,
        expiresAt: seed.expiresAt,
        notes: seed.notes,
      },
    });
    created++;
  }

  console.log(`✅ Created/updated ${created} sample reservations`);
}

async function main() {
  await seedDatabase();
  await seedReservations();
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
