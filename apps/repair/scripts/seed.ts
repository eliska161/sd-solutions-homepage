/**
 * Seed demo data for SD Solutions Repair ops.
 * Run: npm run db:seed
 *
 * Demo admin: admin@sd-solutions.org / RepairAdmin123!
 */
import { eq } from "drizzle-orm";
import { getAuth } from "../src/lib/auth";
import { getDb, getSql } from "../src/lib/db";
import { nextPublicId } from "../src/lib/sequences";
import { createPublicAccessToken } from "../src/lib/public-token";
import { dealRisk, roiBps, krToOre } from "../src/lib/money";
import {
  customers,
  devices,
  flipCandidates,
  parts,
  refurbishmentAcquisitions,
  refurbishmentCosts,
  refurbishments,
  repairNotes,
  repairTickets,
  repairTicketStatusHistory,
  services,
  suppliers,
  users,
} from "../src/db/schema";

const DEMO = "[DEMO]";
const ADMIN_EMAIL = "admin@sd-solutions.org";
const ADMIN_PASSWORD = "RepairAdmin123!";

async function ensureAdmin() {
  const db = getDb();
  const auth = getAuth();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({ role: "ADMIN", name: "SD Admin", updatedAt: new Date() })
      .where(eq(users.id, existing[0].id));
    console.log("Admin user already exists — role ensured ADMIN");
    return existing[0].id;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: "SD Admin",
    },
  });

  const userId = result.user?.id;
  if (!userId) {
    throw new Error("signUpEmail did not return a user id");
  }

  await db
    .update(users)
    .set({ role: "ADMIN", updatedAt: new Date() })
    .where(eq(users.id, userId));

  console.log(`Created ADMIN ${ADMIN_EMAIL}`);
  return userId;
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL missing — use --env-file=.env.local");
  }

  const db = getDb();
  const adminId = await ensureAdmin();

  const existingDemo = await db
    .select()
    .from(customers)
    .where(eq(customers.notes, `${DEMO} Seed kunde`))
    .limit(1);

  if (existingDemo[0]) {
    console.log("Demo data already present — skipping business seed");
    await getSql().end({ timeout: 5 });
    return;
  }

  const [customer1] = await db
    .insert(customers)
    .values({
      name: "Ola Nordmann",
      phone: "+47 900 00 001",
      email: "ola.demo@example.com",
      streetAddress: "Storgata 1",
      postalCode: "2406",
      city: "Elverum",
      country: "Norge",
      address: "Storgata 1, 2406 Elverum, Norge",
      notes: `${DEMO} Seed kunde`,
      lastActivityAt: new Date(),
    })
    .returning();

  const [customer2] = await db
    .insert(customers)
    .values({
      name: "Kari Hansen",
      phone: "+47 900 00 002",
      email: "kari.demo@example.com",
      streetAddress: "Kirkevegen 12",
      postalCode: "2406",
      city: "Elverum",
      country: "Norge",
      address: "Kirkevegen 12, 2406 Elverum, Norge",
      notes: `${DEMO} Seed kunde 2`,
      lastActivityAt: new Date(),
    })
    .returning();

  const [device1] = await db
    .insert(devices)
    .values({
      brand: "Apple",
      model: "iPhone 13",
      storage: "128GB",
      color: "Midnight",
      imei: "356938035643809",
      batteryHealth: 87,
      ownershipType: "CUSTOMER",
      customerId: customer1.id,
      condition: `${DEMO} Lett bruksslitasje`,
    })
    .returning();

  const [device2] = await db
    .insert(devices)
    .values({
      brand: "Apple",
      model: "iPhone 14 Pro",
      storage: "256GB",
      color: "Deep Purple",
      imei: "353918103928471",
      batteryHealth: 92,
      ownershipType: "CUSTOMER",
      customerId: customer2.id,
      condition: `${DEMO} Knust skjerm`,
    })
    .returning();

  const [device3] = await db
    .insert(devices)
    .values({
      brand: "Apple",
      model: "iPhone 12",
      storage: "64GB",
      color: "Black",
      ownershipType: "CUSTOMER",
      customerId: customer1.id,
      condition: `${DEMO} Batteri dårlig`,
    })
    .returning();

  const [supplier] = await db
    .insert(suppliers)
    .values({
      name: "iFixit Pro (DEMO)",
      website: "https://pro.ifixit.com",
      currency: "NOK",
      notes: `${DEMO} Leverandør`,
      apiSupported: false,
    })
    .returning();

  const [screenPart] = await db
    .insert(parts)
    .values({
      sku: "SCR-IP13-OLED",
      name: "iPhone 13 Soft OLED skjerm",
      category: "Skjerm",
      brand: "Compatible",
      partType: "SOFT_OLED",
      costPriceOre: krToOre(890),
      sellPriceOre: krToOre(2490),
      quantityOnHand: 4,
      minimumStock: 2,
      location: "Hylle A1",
      warrantyDays: 90,
    })
    .returning();

  await db.insert(parts).values({
    sku: "BAT-IP12",
    name: "iPhone 12 batteri",
    category: "Batteri",
    brand: "OEM-pull",
    partType: "BATTERY",
    costPriceOre: krToOre(320),
    sellPriceOre: krToOre(1290),
    quantityOnHand: 1,
    minimumStock: 2,
    location: "Hylle B2",
    warrantyDays: 90,
  });

  await db.insert(services).values([
    {
      code: "SCREEN-IP13",
      name: "Skjermbytte iPhone 13",
      description: `${DEMO} Standard skjermjobb`,
      customerPriceOre: krToOre(2490),
      estimatedPartsCostOre: krToOre(890),
      estimatedLaborMinutes: 45,
      warrantyDays: 90,
    },
    {
      code: "BATTERY-IP12",
      name: "Batteribytte iPhone 12",
      description: `${DEMO} Batterijobb`,
      customerPriceOre: krToOre(1290),
      estimatedPartsCostOre: krToOre(320),
      estimatedLaborMinutes: 30,
      warrantyDays: 90,
    },
    {
      code: "DIAG",
      name: "Diagnostikk",
      description: `${DEMO} Inntaksdiagnose`,
      customerPriceOre: krToOre(399),
      estimatedLaborMinutes: 20,
      warrantyDays: 0,
    },
  ]);

  const ticketNumbers = [
    await nextPublicId("REP"),
    await nextPublicId("REP"),
    await nextPublicId("REP"),
  ];

  const [ticket1] = await db
    .insert(repairTickets)
    .values({
      ticketNumber: ticketNumbers[0],
      customerId: customer1.id,
      deviceId: device1.id,
      customerProblem: `${DEMO} Skjermen flimrer etter fall`,
      physicalCondition: "Ramme OK, glass sprukket nederst",
      status: "DIAGNOSTICS",
      assigneeId: adminId,
      publicAccessToken: createPublicAccessToken(),
      estimatedCompletionDate: new Date(Date.UTC(2026, 8, 12, 12, 0, 0)),
      customerPriceOre: krToOre(2490),
      estimatedPartsCostOre: screenPart.costPriceOre,
    })
    .returning();

  await db.insert(repairTicketStatusHistory).values([
    {
      ticketId: ticket1.id,
      fromStatus: null,
      toStatus: "NEW",
      changedById: adminId,
      note: `${DEMO} Opprettet`,
    },
    {
      ticketId: ticket1.id,
      fromStatus: "NEW",
      toStatus: "DIAGNOSTICS",
      changedById: adminId,
      note: `${DEMO} Startet diagnose`,
    },
  ]);

  const [ticket2] = await db
    .insert(repairTickets)
    .values({
      ticketNumber: ticketNumbers[1],
      customerId: customer2.id,
      deviceId: device2.id,
      customerProblem: `${DEMO} Knust skjerm, Face ID usikker`,
      physicalCondition: "Display knust, bakglass OK",
      status: "WAITING_FOR_CUSTOMER",
      assigneeId: adminId,
      publicAccessToken: createPublicAccessToken(),
      estimatedCompletionDate: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)),
      customerPriceOre: krToOre(3990),
      estimatedPartsCostOre: krToOre(1600),
    })
    .returning();

  await db.insert(repairTickets).values({
    ticketNumber: ticketNumbers[2],
    customerId: customer1.id,
    deviceId: device3.id,
    customerProblem: `${DEMO} Batteri varer under en dag`,
    physicalCondition: "OK kosmetikk",
    status: "NEW",
    assigneeId: adminId,
    publicAccessToken: createPublicAccessToken(),
    customerPriceOre: krToOre(1290),
    estimatedPartsCostOre: krToOre(320),
  });

  await db.insert(repairNotes).values([
    {
      ticketId: ticket1.id,
      authorId: adminId,
      content: `${DEMO} Intern: Soft OLED på lager, booket`,
      visibility: "INTERNAL",
    },
    {
      ticketId: ticket2.id,
      authorId: adminId,
      content: `${DEMO} Venter på kundens godkjenning av pris`,
      visibility: "CUSTOMER",
    },
  ]);

  const asking = krToOre(2200);
  const shipping = krToOre(89);
  const repairEst = krToOre(900);
  const resale = krToOre(4500);
  const investment = asking + shipping + repairEst;
  const profit = resale - investment;
  const roi = roiBps(profit, investment);

  const [candidate] = await db
    .insert(flipCandidates)
    .values({
      listingUrl: "https://www.finn.no/demo/123",
      platform: "FINN",
      seller: "Privat DEMO",
      model: "iPhone 11",
      storage: "64GB",
      color: "White",
      askingPriceOre: asking,
      shippingOre: shipping,
      reportedFault: `${DEMO} Død skjerm`,
      condition: "Ukjent batteri",
      estimatedRepairOre: repairEst,
      estimatedResaleOre: resale,
      estimatedInvestmentOre: investment,
      estimatedProfitOre: profit,
      estimatedRoiBps: roi,
      risk: dealRisk(profit, roi),
      notes: `${DEMO} God kandidat`,
      createdById: adminId,
    })
    .returning();

  const flipNumber = await nextPublicId("FLIP");
  const purchaseOre = krToOre(2100);

  const [flip] = await db
    .insert(refurbishments)
    .values({
      flipNumber,
      candidateId: null,
      status: "IN_REPAIR",
      model: "iPhone XR",
      storage: "128GB",
      color: "Blue",
      imei: "353260051234567",
      batteryHealth: 84,
      activationLockClear: true,
      findMyOff: true,
      estimatedPurchaseOre: purchaseOre,
      actualPurchaseOre: purchaseOre,
      estimatedRepairOre: krToOre(700),
      actualRepairOre: krToOre(650),
      estimatedSaleOre: krToOre(3800),
      estimatedProfitOre: krToOre(3800) - purchaseOre - krToOre(650),
      notes: `${DEMO} Aktiv flip under reparasjon`,
      createdById: adminId,
      purchasedAt: new Date(),
      receivedAt: new Date(),
    })
    .returning();

  await db.insert(refurbishmentAcquisitions).values({
    refurbishmentId: flip.id,
    purchasePriceOre: purchaseOre,
    shippingOre: krToOre(79),
    platform: "FINN",
    seller: "DEMO selger",
    listingUrl: "https://www.finn.no/demo/xr",
    originalDescription: `${DEMO} Knust glass`,
    purchasedAt: new Date(),
  });

  await db.insert(refurbishmentCosts).values([
    {
      refurbishmentId: flip.id,
      category: "PURCHASE",
      label: `${DEMO} Kjøpspris`,
      amountOre: purchaseOre,
    },
    {
      refurbishmentId: flip.id,
      category: "PART",
      label: `${DEMO} Soft OLED`,
      amountOre: krToOre(650),
      partId: screenPart.id,
    },
  ]);

  console.log("Seed complete:");
  console.log(`  admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  customers: ${customer1.name}, ${customer2.name}`);
  console.log(`  repairs: ${ticketNumbers.join(", ")}`);
  console.log(`  candidate: ${candidate.model}`);
  console.log(`  flip: ${flipNumber}`);
  console.log(`  supplier: ${supplier.name}`);

  await getSql().end({ timeout: 5 });
}

seed().catch(async (err) => {
  console.error(err);
  try {
    await getSql().end({ timeout: 2 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
