import { PrismaClient, Prisma, Role, MovementType, PaymentMethod, SaleStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Shop & ShopSettings
  const shop = await prisma.shop.upsert({
    where: { id: 'shop_apex_retail_main' },
    update: {},
    create: {
      id: 'shop_apex_retail_main',
      name: 'Apex Retail & Mart',
      legalName: 'Apex Retail Enterprises LLC',
      phone: '+1 (555) 019-2834',
      email: 'contact@apexretail.com',
      address: '100 Commerce Boulevard, Suite 400, Metro City, NY 10001',
      currencySymbol: '$',
      currencyCode: 'USD',
      taxRatePercent: 8.5,
      invoicePrefix: 'INV',
      receiptFooter: 'Thank you for shopping at Apex Retail & Mart! Please retain your receipt for returns within 30 days.',
      lowStockDefault: 5,
    },
  });
  console.log('✅ Shop seeded:', shop.name);

  await prisma.shopSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      shopName: 'Apex Retail & Mart',
      currencySymbol: '$',
      currencyCode: 'USD',
      taxRatePercent: 8.5,
      invoicePrefix: 'INV',
      receiptFooter: 'Thank you for shopping with Apex Retail!',
      lowStockDefault: 5,
    },
  });
  console.log('✅ Shop settings seeded');

  // 2. Seed Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@apexretail.com' },
    update: {},
    create: {
      name: 'Eleanor Vance (Admin)',
      email: 'admin@apexretail.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@apexretail.com' },
    update: {},
    create: {
      name: 'Marcus Brody (Manager)',
      email: 'manager@apexretail.com',
      passwordHash: managerPassword,
      role: Role.MANAGER,
      isActive: true,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@apexretail.com' },
    update: {},
    create: {
      name: 'Chloe Decker (Cashier)',
      email: 'cashier@apexretail.com',
      passwordHash: cashierPassword,
      role: Role.CASHIER,
      isActive: true,
    },
  });

  const staffPassword = await bcrypt.hash('staff123', 10);
  await prisma.user.upsert({
    where: { email: 'staff@apexretail.com' },
    update: {},
    create: {
      name: 'Sam Miller (Staff)',
      email: 'staff@apexretail.com',
      passwordHash: staffPassword,
      role: Role.STAFF,
      isActive: true,
    },
  });
  console.log('✅ Users seeded: Admin (Eleanor), Manager (Marcus), Cashier (Chloe), Staff (Sam)');

  // 3. Seed Categories
  const categoriesData = [
    { name: 'Electronics & Audio', description: 'Headphones, cables, accessories, smart devices' },
    { name: 'Home & Kitchen', description: 'Appliances, cookware, storage solutions' },
    { name: 'Apparel & Wearables', description: 'Clothing, footwear, daily essentials' },
    { name: 'Beverages & Snacks', description: 'Gourmet coffees, teas, snacks, beverages' },
    { name: 'Stationery & Office', description: 'Notebooks, pens, desk organizers' },
    { name: 'Personal Care & Wellness', description: 'Soaps, creams, personal care essentials' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap[cat.name] = record.id;
  }
  console.log('✅ Categories seeded (6 categories)');

  // 4. Seed Products (24 realistic products)
  const productsData = [
    {
      sku: 'ELEC-WH-100',
      barcode: '890123456001',
      name: 'AcousticPro Wireless Headphones',
      description: 'Active noise cancelling Bluetooth over-ear headphones',
      categoryName: 'Electronics & Audio',
      costPrice: 45.0,
      sellingPrice: 89.99,
      initialStock: 25,
      minStockAlert: 5,
      unit: 'pcs',
    },
    {
      sku: 'ELEC-CB-002',
      barcode: '890123456002',
      name: 'Braided USB-C Fast Charging Cable (2m)',
      description: 'Durable nylon 100W PD braided cable',
      categoryName: 'Electronics & Audio',
      costPrice: 3.2,
      sellingPrice: 12.5,
      initialStock: 4, // Low stock for alert demo
      minStockAlert: 10,
      unit: 'pcs',
    },
    {
      sku: 'ELEC-SP-003',
      barcode: '890123456003',
      name: 'PulseMini Portable Bluetooth Speaker',
      description: 'IPX7 waterproof 12-hour battery mini speaker',
      categoryName: 'Electronics & Audio',
      costPrice: 18.0,
      sellingPrice: 39.99,
      initialStock: 15,
      minStockAlert: 4,
      unit: 'pcs',
    },
    {
      sku: 'ELEC-MS-004',
      barcode: '890123456004',
      name: 'ErgoGrip Wireless Vertical Mouse',
      description: 'Ergonomic 2.4GHz rechargeable wireless optical mouse',
      categoryName: 'Electronics & Audio',
      costPrice: 14.5,
      sellingPrice: 34.99,
      initialStock: 20,
      minStockAlert: 5,
      unit: 'pcs',
    },
    {
      sku: 'ELEC-PB-005',
      barcode: '890123456005',
      name: 'PowerCore 20,000mAh Ultra Battery Bank',
      description: 'High capacity dual USB-C power delivery charger',
      categoryName: 'Electronics & Audio',
      costPrice: 22.0,
      sellingPrice: 49.99,
      initialStock: 8,
      minStockAlert: 5,
      unit: 'pcs',
    },
    {
      sku: 'HOME-KM-101',
      barcode: '890123456006',
      name: 'Ceramic Pour-Over Coffee Dripper',
      description: 'Handcrafted ceramic V60 style coffee maker',
      categoryName: 'Home & Kitchen',
      costPrice: 10.5,
      sellingPrice: 24.99,
      initialStock: 18,
      minStockAlert: 5,
      unit: 'pcs',
    },
    {
      sku: 'HOME-TB-102',
      barcode: '890123456007',
      name: 'Stainless Steel Insulated Tumbler 500ml',
      description: 'Double wall vacuum insulated flask',
      categoryName: 'Home & Kitchen',
      costPrice: 7.0,
      sellingPrice: 19.5,
      initialStock: 0, // Intentionally out of stock for warning demo
      minStockAlert: 5,
      unit: 'pcs',
    },
    {
      sku: 'HOME-SC-103',
      barcode: '890123456008',
      name: 'Digital Precision Kitchen Scale',
      description: '1g precision stainless platform with tare function',
      categoryName: 'Home & Kitchen',
      costPrice: 8.5,
      sellingPrice: 21.99,
      initialStock: 14,
      minStockAlert: 4,
      unit: 'pcs',
    },
    {
      sku: 'HOME-GL-104',
      barcode: '890123456009',
      name: 'Double-Wall Borosilicate Glass Mugs (Set of 2)',
      description: 'Heat resistant 350ml insulated glass cups',
      categoryName: 'Home & Kitchen',
      costPrice: 9.0,
      sellingPrice: 22.5,
      initialStock: 12,
      minStockAlert: 4,
      unit: 'box',
    },
    {
      sku: 'HOME-CS-105',
      barcode: '890123456010',
      name: 'Cast Iron Skillet 10-Inch Pre-Seasoned',
      description: 'Heavy duty pre-seasoned cast iron frying pan',
      categoryName: 'Home & Kitchen',
      costPrice: 16.0,
      sellingPrice: 36.0,
      initialStock: 7,
      minStockAlert: 3,
      unit: 'pcs',
    },
    {
      sku: 'SNK-CF-201',
      barcode: '890123456011',
      name: 'Artisan Dark Roast Whole Bean Coffee (500g)',
      description: 'Single-origin Arabica beans, rich chocolate notes',
      categoryName: 'Beverages & Snacks',
      costPrice: 8.0,
      sellingPrice: 16.0,
      initialStock: 40,
      minStockAlert: 8,
      unit: 'bag',
    },
    {
      sku: 'SNK-MT-202',
      barcode: '890123456012',
      name: 'Organic Ceremonial Grade Matcha (100g)',
      description: 'First harvest stone-ground green tea powder',
      categoryName: 'Beverages & Snacks',
      costPrice: 14.0,
      sellingPrice: 29.99,
      initialStock: 12,
      minStockAlert: 4,
      unit: 'tin',
    },
    {
      sku: 'SNK-CT-203',
      barcode: '890123456013',
      name: 'Himalayan Pink Rock Salt Roasted Almonds (250g)',
      description: 'Dry roasted California almonds with mineral sea salt',
      categoryName: 'Beverages & Snacks',
      costPrice: 4.5,
      sellingPrice: 9.99,
      initialStock: 25,
      minStockAlert: 6,
      unit: 'pack',
    },
    {
      sku: 'SNK-CH-204',
      barcode: '890123456014',
      name: 'Single-Origin Madagascar Dark Chocolate 72%',
      description: 'Bean to bar organic dark chocolate slab 100g',
      categoryName: 'Beverages & Snacks',
      costPrice: 2.5,
      sellingPrice: 5.5,
      initialStock: 50,
      minStockAlert: 10,
      unit: 'bar',
    },
    {
      sku: 'OFF-NB-301',
      barcode: '890123456015',
      name: 'Hardcover Dot-Grid Journal A5',
      description: '160gsm bleed-proof bamboo paper notebook',
      categoryName: 'Stationery & Office',
      costPrice: 6.5,
      sellingPrice: 18.0,
      initialStock: 30,
      minStockAlert: 6,
      unit: 'pcs',
    },
    {
      sku: 'OFF-PN-302',
      barcode: '890123456016',
      name: 'Precision Metal Rollerball Pen (Matte Black)',
      description: '0.5mm tungsten carbide refillable pen',
      categoryName: 'Stationery & Office',
      costPrice: 4.0,
      sellingPrice: 11.99,
      initialStock: 3, // Low stock
      minStockAlert: 10,
      unit: 'pcs',
    },
    {
      sku: 'OFF-MP-303',
      barcode: '890123456017',
      name: 'Minimalist Felt Desk Mat & Mouse Pad',
      description: '90x40cm premium water-resistant felt desk blotter',
      categoryName: 'Stationery & Office',
      costPrice: 9.5,
      sellingPrice: 24.0,
      initialStock: 16,
      minStockAlert: 5,
      unit: 'pcs',
    },
    {
      sku: 'OFF-HL-304',
      barcode: '890123456018',
      name: 'Pastel Chisel-Tip Highlighter Set (6-Pack)',
      description: 'Soft eye-friendly pastel markers for reading and study',
      categoryName: 'Stationery & Office',
      costPrice: 3.0,
      sellingPrice: 8.99,
      initialStock: 35,
      minStockAlert: 8,
      unit: 'pack',
    },
    {
      sku: 'APP-TS-401',
      barcode: '890123456019',
      name: 'Heavyweight Cotton Crewneck Tee (L)',
      description: '240 GSM pre-shrunk combed organic cotton',
      categoryName: 'Apparel & Wearables',
      costPrice: 9.0,
      sellingPrice: 28.0,
      initialStock: 20,
      minStockAlert: 5,
      unit: 'pcs',
    },
    {
      sku: 'APP-HD-402',
      barcode: '890123456020',
      name: 'Brushed Fleece Pullover Hoodie (XL)',
      description: 'Cozy organic fleece with kangaroo pocket',
      categoryName: 'Apparel & Wearables',
      costPrice: 19.0,
      sellingPrice: 48.0,
      initialStock: 11,
      minStockAlert: 4,
      unit: 'pcs',
    },
    {
      sku: 'APP-CP-403',
      barcode: '890123456021',
      name: 'Vintage Washed Cotton Baseball Cap',
      description: 'Adjustable brass buckle strap low-profile cap',
      categoryName: 'Apparel & Wearables',
      costPrice: 6.0,
      sellingPrice: 16.5,
      initialStock: 2, // Low stock
      minStockAlert: 5,
      unit: 'pcs',
    },
    {
      sku: 'APP-SK-404',
      barcode: '890123456022',
      name: 'Merino Wool Performance Crew Socks (M)',
      description: 'Cushioned arch support anti-odor hiking socks',
      categoryName: 'Apparel & Wearables',
      costPrice: 4.5,
      sellingPrice: 12.0,
      initialStock: 28,
      minStockAlert: 6,
      unit: 'pair',
    },
    {
      sku: 'CARE-SP-501',
      barcode: '890123456023',
      name: 'Organic Lavender Botanical Bar Soap',
      description: 'Cold-processed essential oil moisturizing bar',
      categoryName: 'Personal Care & Wellness',
      costPrice: 2.2,
      sellingPrice: 6.5,
      initialStock: 45,
      minStockAlert: 10,
      unit: 'bar',
    },
    {
      sku: 'CARE-CR-502',
      barcode: '890123456024',
      name: 'Shea Butter Intensive Hand Cream 75ml',
      description: 'Deep hydrating 20% raw shea butter treatment',
      categoryName: 'Personal Care & Wellness',
      costPrice: 3.8,
      sellingPrice: 10.99,
      initialStock: 0, // Out of stock demo
      minStockAlert: 5,
      unit: 'tube',
    },
  ];

  const createdProducts: Record<
    string,
    {
      id: string;
      sku: string;
      name: string;
      costPrice: Prisma.Decimal | number;
      sellingPrice: Prisma.Decimal | number;
      stock: number;
    }
  > = {};

  for (const item of productsData) {
    const existing = await prisma.product.findUnique({ where: { sku: item.sku } });
    if (!existing) {
      const product = await prisma.product.create({
        data: {
          sku: item.sku,
          barcode: item.barcode,
          name: item.name,
          description: item.description,
          categoryId: categoryMap[item.categoryName],
          costPrice: item.costPrice,
          purchasePrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          stock: item.initialStock,
          minStockAlert: item.minStockAlert,
          unit: item.unit,
          isActive: true,
        },
      });
      createdProducts[item.sku] = product;

      // Create initial intake inventory movement for products with opening stock
      if (item.initialStock > 0) {
        await prisma.inventoryMovement.create({
          data: {
            productId: product.id,
            quantityChange: item.initialStock,
            stockBefore: 0,
            stockAfter: item.initialStock,
            type: MovementType.PURCHASE,
            referenceType: 'PURCHASE_ORDER',
            referenceId: 'PO-INIT-2026',
            reason: 'Opening store inventory intake',
            userId: admin.id,
          },
        });
      }
    } else {
      createdProducts[item.sku] = existing;
    }
  }
  console.log(`✅ Products seeded (${productsData.length} products with initial inventory movements)`);

  // 5. Seed Customers
  const customer1 = await prisma.customer.upsert({
    where: { phone: '+1-555-0199' },
    update: {},
    create: {
      name: 'Samantha Reed',
      phone: '+1-555-0199',
      email: 'samantha.reed@example.com',
      address: '742 Evergreen Terrace, Springfield',
      notes: 'VIP customer, preferred payment: Card',
      isActive: true,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { phone: '+1-555-0245' },
    update: {},
    create: {
      name: 'David Miller',
      phone: '+1-555-0245',
      email: 'david.miller@example.com',
      address: '124 Elm Street, Riverdale',
      notes: 'Regular customer, interested in electronics',
      isActive: true,
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { phone: '+1-555-0381' },
    update: {},
    create: {
      name: 'Olivia Zhang',
      phone: '+1-555-0381',
      email: 'olivia.zhang@example.com',
      address: '88 Oak Avenue, Brookfield',
      notes: 'Prefers digital receipts via UPI',
      isActive: true,
    },
  });
  console.log('✅ Customers seeded (3 customers)');

  // 6. Seed Historical Sales
  const salesToSeed = [
    {
      invoiceNumber: 'INV-2026-0001',
      saleNumber: 'INV-2026-0001',
      userId: cashier.id,
      customerId: customer1.id,
      shopId: shop.id,
      paymentMethod: PaymentMethod.CARD,
      paymentStatus: PaymentStatus.PAID,
      status: SaleStatus.COMPLETED,
      notes: 'Walk-in retail customer card checkout',
      items: [
        { sku: 'ELEC-WH-100', qty: 1 },
        { sku: 'SNK-CF-201', qty: 2 },
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    },
    {
      invoiceNumber: 'INV-2026-0002',
      saleNumber: 'INV-2026-0002',
      userId: cashier.id,
      customerId: customer2.id,
      shopId: shop.id,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
      status: SaleStatus.COMPLETED,
      notes: 'Counter sale with exact cash payment',
      items: [
        { sku: 'HOME-KM-101', qty: 1 },
        { sku: 'SNK-MT-202', qty: 1 },
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
    },
    {
      invoiceNumber: 'INV-2026-0003',
      saleNumber: 'INV-2026-0003',
      userId: cashier.id,
      customerId: customer3.id,
      shopId: shop.id,
      paymentMethod: PaymentMethod.UPI,
      paymentStatus: PaymentStatus.PAID,
      status: SaleStatus.COMPLETED,
      notes: 'Mobile QR code scan & pay',
      items: [
        { sku: 'OFF-NB-301', qty: 2 },
        { sku: 'OFF-PN-302', qty: 1 },
        { sku: 'SNK-CH-204', qty: 3 },
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // Today earlier
    },
    {
      invoiceNumber: 'INV-2026-0004',
      saleNumber: 'INV-2026-0004',
      userId: manager.id,
      customerId: customer1.id,
      shopId: shop.id,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PAID,
      status: SaleStatus.COMPLETED,
      notes: 'Corporate bulk invoice for office lounge',
      items: [
        { sku: 'ELEC-MS-004', qty: 2 },
        { sku: 'OFF-MP-303', qty: 2 },
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    },
    {
      invoiceNumber: 'INV-2026-0005',
      saleNumber: 'INV-2026-0005',
      userId: cashier.id,
      customerId: null,
      shopId: shop.id,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.REFUNDED,
      status: SaleStatus.CANCELLED,
      cancellationReason: 'Customer requested immediate exchange on receipt',
      cancelledAt: new Date(Date.now() - 1000 * 60 * 60 * 1),
      notes: 'Returned & cancelled sale transaction',
      items: [
        { sku: 'APP-TS-401', qty: 1 },
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
  ];

  for (const s of salesToSeed) {
    const existingSale = await prisma.sale.findUnique({ where: { invoiceNumber: s.invoiceNumber } });
    if (!existingSale) {
      // Calculate totals
      let subtotal = 0;
      const lineItems = [];

      for (const item of s.items) {
        const prod = createdProducts[item.sku];
        if (!prod) continue;
        const unitPrice = Number(prod.sellingPrice);
        const costPrice = Number(prod.costPrice);
        const itemSubtotal = unitPrice * item.qty;
        subtotal += itemSubtotal;

        lineItems.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: item.qty,
          costPrice,
          unitPrice,
          discount: 0,
          tax: 0,
          subtotal: itemSubtotal,
          total: itemSubtotal,
        });
      }

      const tax = Number((subtotal * 0.085).toFixed(2));
      const grandTotal = Number((subtotal + tax).toFixed(2));

      const sale = await prisma.sale.create({
        data: {
          invoiceNumber: s.invoiceNumber,
          saleNumber: s.saleNumber,
          userId: s.userId,
          shopId: s.shopId,
          customerId: s.customerId,
          subtotal,
          tax,
          taxAmount: tax,
          discount: 0,
          discountAmount: 0,
          total: grandTotal,
          grandTotal,
          paymentMethod: s.paymentMethod,
          paymentStatus: s.paymentStatus,
          status: s.status,
          notes: s.notes,
          cancellationReason: s.cancellationReason,
          cancelledAt: s.cancelledAt,
          cancelledById: s.cancellationReason ? s.userId : null,
          createdAt: s.createdAt,
          items: {
            create: lineItems,
          },
        },
      });

      // Seed corresponding Payment record
      await prisma.payment.create({
        data: {
          saleId: sale.id,
          amount: grandTotal,
          method: s.paymentMethod,
          status: s.paymentStatus,
          transactionRef: s.paymentMethod === PaymentMethod.UPI ? 'UPI-TXN-948271' : s.paymentMethod === PaymentMethod.CARD ? 'CARD-AUTH-8821' : null,
          receivedById: s.userId,
          notes: `Payment for invoice ${sale.invoiceNumber}`,
          createdAt: s.createdAt,
        },
      });

      // Deduct inventory and record movements
      for (const item of s.items) {
        const prod = createdProducts[item.sku];
        if (!prod) continue;

        // Deduct stock for completed or historical sales
        await prisma.product.update({
          where: { id: prod.id },
          data: { stock: { decrement: item.qty } },
        });

        const updatedProd = await prisma.product.findUnique({ where: { id: prod.id } });
        const currentStock = updatedProd?.stock ?? 0;

        await prisma.inventoryMovement.create({
          data: {
            productId: prod.id,
            quantityChange: -item.qty,
            stockBefore: currentStock + item.qty,
            stockAfter: currentStock,
            type: MovementType.SALE,
            referenceId: sale.id,
            referenceType: 'SALE',
            reason: `Checkout sale ${sale.invoiceNumber}`,
            userId: s.userId,
            saleId: sale.id,
            createdAt: s.createdAt,
          },
        });

        // If cancelled, demonstrate SALE_REVERSAL movement restoring stock
        if (s.status === SaleStatus.CANCELLED) {
          await prisma.product.update({
            where: { id: prod.id },
            data: { stock: { increment: item.qty } },
          });

          await prisma.inventoryMovement.create({
            data: {
              productId: prod.id,
              quantityChange: item.qty,
              stockBefore: currentStock,
              stockAfter: currentStock + item.qty,
              type: MovementType.SALE_REVERSAL,
              referenceId: sale.id,
              referenceType: 'SALE_REVERSAL',
              reason: `Stock restored from cancelled sale ${sale.invoiceNumber}`,
              userId: s.userId,
              saleId: sale.id,
              createdAt: s.cancelledAt ?? new Date(),
            },
          });
        }
      }
    }
  }
  console.log('✅ Historical sales & inventory movement history seeded');

  // 7. Seed Audit Logs for important actions
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SHOP_INITIALIZED',
        entity: 'Shop',
        entityId: shop.id,
        metadata: { shopName: shop.name, currency: shop.currencyCode },
      },
      {
        userId: admin.id,
        action: 'PRODUCT_CREATED',
        entity: 'Product',
        entityId: createdProducts['ELEC-WH-100']?.id,
        metadata: { sku: 'ELEC-WH-100', name: 'AcousticPro Wireless Headphones', stock: 25 },
      },
      {
        userId: manager.id,
        action: 'INVENTORY_ADJUSTED',
        entity: 'Inventory',
        entityId: createdProducts['ELEC-CB-002']?.id,
        metadata: { sku: 'ELEC-CB-002', adjustment: 4, reason: 'Physical stock count correction' },
      },
      {
        userId: cashier.id,
        action: 'SALE_CREATED',
        entity: 'Sale',
        entityId: 'INV-2026-0001',
        metadata: { total: 132.36, method: 'CARD' },
      },
      {
        userId: cashier.id,
        action: 'SALE_CANCELLED',
        entity: 'Sale',
        entityId: 'INV-2026-0005',
        metadata: { invoiceNumber: 'INV-2026-0005', reason: 'Customer requested immediate exchange on receipt' },
      },
      {
        userId: admin.id,
        action: 'SETTINGS_CHANGED',
        entity: 'ShopSettings',
        entityId: 'default',
        metadata: { taxRatePercent: 8.5, lowStockDefault: 5 },
      },
    ],
  });
  console.log('✅ Audit logs seeded for key domain actions');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
