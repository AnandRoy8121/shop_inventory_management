import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Gangga Aqua database seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Owner User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await prisma.user.create({
    data: {
      email: 'admin@ganggaaqua.com',
      name: 'Gangga Aqua Owner',
      passwordHash,
    },
  });
  console.log(`👤 Created shop owner: ${user.email}`);

  // 3. Create Categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Packaged Water' } }),
    prisma.category.create({ data: { name: 'Dispensers & Pumps' } }),
    prisma.category.create({ data: { name: 'Beverages & Sodas' } }),
    prisma.category.create({ data: { name: 'Snacks & Munchies' } }),
  ]);
  const [water, dispensers, beverages, snacks] = categories;

  // 4. Create Products with INR Pricing
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Gangga Aqua 20L Water Jar',
        categoryId: water.id,
        purchasePrice: 40.0,
        sellingPrice: 80.0,
        stock: 45,
        minStock: 15,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Gangga Aqua 1L Mineral Water (Case of 12)',
        categoryId: water.id,
        purchasePrice: 120.0,
        sellingPrice: 180.0,
        stock: 25,
        minStock: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Gangga Aqua 500ml Water Bottle',
        categoryId: water.id,
        purchasePrice: 6.0,
        sellingPrice: 10.0,
        stock: 6, // LOW STOCK (min 15)
        minStock: 15,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Automatic Rechargeable Water Pump',
        categoryId: dispensers.id,
        purchasePrice: 320.0,
        sellingPrice: 599.0,
        stock: 0, // OUT OF STOCK
        minStock: 4,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Manual Jar Hand Pump Dispenser',
        categoryId: dispensers.id,
        purchasePrice: 120.0,
        sellingPrice: 220.0,
        stock: 8,
        minStock: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Fresh Lime Soda 300ml Can',
        categoryId: beverages.id,
        purchasePrice: 20.0,
        sellingPrice: 35.0,
        stock: 30,
        minStock: 10,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Electrolyte Energy Drink 250ml',
        categoryId: beverages.id,
        purchasePrice: 65.0,
        sellingPrice: 110.0,
        stock: 14,
        minStock: 5,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Masala Potato Crisps 80g',
        categoryId: snacks.id,
        purchasePrice: 12.0,
        sellingPrice: 20.0,
        stock: 40,
        minStock: 12,
        isActive: true,
      },
    }),
  ]);
  console.log(`📦 Seeded ${products.length} Gangga Aqua products with INR pricing`);

  // 5. Seed Historical Sales in INR
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  // Sale 1: Today
  await prisma.sale.create({
    data: {
      saleNumber: 'SALE-1001',
      totalAmount: 380.0,
      totalCost: 200.0,
      profit: 180.0,
      createdAt: now,
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            quantity: 3,
            unitCost: 40.0,
            unitPrice: 80.0,
            subtotal: 240.0,
          },
          {
            productId: products[5].id,
            productName: products[5].name,
            quantity: 4,
            unitCost: 20.0,
            unitPrice: 35.0,
            subtotal: 140.0,
          },
        ],
      },
    },
  });

  // Sale 2: Yesterday
  await prisma.sale.create({
    data: {
      saleNumber: 'SALE-1002',
      totalAmount: 580.0,
      totalCost: 360.0,
      profit: 220.0,
      createdAt: yesterday,
      items: {
        create: [
          {
            productId: products[1].id,
            productName: products[1].name,
            quantity: 2,
            unitCost: 120.0,
            unitPrice: 180.0,
            subtotal: 360.0,
          },
          {
            productId: products[4].id,
            productName: products[4].name,
            quantity: 1,
            unitCost: 120.0,
            unitPrice: 220.0,
            subtotal: 220.0,
          },
        ],
      },
    },
  });

  // Sale 3: 3 days ago (This Week)
  await prisma.sale.create({
    data: {
      saleNumber: 'SALE-1003',
      totalAmount: 480.0,
      totalCost: 250.0,
      profit: 230.0,
      createdAt: threeDaysAgo,
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            quantity: 4,
            unitCost: 40.0,
            unitPrice: 80.0,
            subtotal: 320.0,
          },
          {
            productId: products[7].id,
            productName: products[7].name,
            quantity: 5,
            unitCost: 12.0,
            unitPrice: 20.0,
            subtotal: 100.0,
          },
          {
            productId: products[2].id,
            productName: products[2].name,
            quantity: 6,
            unitCost: 6.0,
            unitPrice: 10.0,
            subtotal: 60.0,
          },
        ],
      },
    },
  });

  // Sale 4: 10 days ago (This Month)
  await prisma.sale.create({
    data: {
      saleNumber: 'SALE-1004',
      totalAmount: 440.0,
      totalCost: 260.0,
      profit: 180.0,
      createdAt: tenDaysAgo,
      items: {
        create: [
          {
            productId: products[6].id,
            productName: products[6].name,
            quantity: 4,
            unitCost: 65.0,
            unitPrice: 110.0,
            subtotal: 440.0,
          },
        ],
      },
    },
  });

  console.log(`💰 Seeded historical sales across Today, Yesterday, This Week, and This Month`);
  console.log('✅ Gangga Aqua seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
