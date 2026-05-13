import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Testing materialHidden query...");
    const hidden = await prisma.materialHidden.findMany({ where: { visitorId: "test" } });
    console.log("materialHidden OK:", hidden.length);

    console.log("Testing OR query...");
    const items = await prisma.materialItem.findMany({
      where: {
        OR: [
          { visitorId: "test", source: "user" },
          { source: "system" }
        ]
      }
    });
    console.log("OR query OK:", items.length);

    console.log("Testing upsert...");
    await prisma.materialHidden.upsert({
      where: { visitorId_materialId: { visitorId: "test", materialId: "nonexistent" } },
      update: {},
      create: { visitorId: "test", materialId: "nonexistent" }
    }).catch(e => console.log("Upsert expected error:", e.message));

    console.log("All tests passed!");
  } catch (e) {
    console.error("ERROR:", e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();
