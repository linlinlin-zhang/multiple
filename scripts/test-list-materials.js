import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testListMaterials(query, options = {}) {
  const q = typeof query?.q === "string" ? query.q.trim() : "";
  const sort = query?.sort || "added";
  const favoritedOnly = query?.favorited === "1" || query?.favorited === "true";
  const visitorId = options.visitorId || "legacy";

  let where;
  if (favoritedOnly) {
    where = { visitorId, source: "user", favorited: true };
  } else {
    const hiddenRecords = await prisma.materialHidden.findMany({
      where: { visitorId },
      select: { materialId: true }
    });
    const hiddenIds = hiddenRecords.map(h => h.materialId);

    where = {
      OR: [
        { visitorId, source: "user" },
        { source: "system" }
      ]
    };
    if (hiddenIds.length > 0) {
      where.OR[1].id = { notIn: hiddenIds };
    }
    if (q) {
      where.fileName = { contains: q, mode: "insensitive" };
    }
  }

  let orderBy;
  switch (sort) {
    case "date": orderBy = { updatedAt: "desc" }; break;
    case "name": orderBy = { fileName: "asc" }; break;
    case "size": orderBy = { fileSize: "desc" }; break;
    default:     orderBy = { addedAt: "desc" }; break;
  }

  const [items, total] = await Promise.all([
    prisma.materialItem.findMany({ where, orderBy }),
    prisma.materialItem.count({ where })
  ]);

  console.log("items:", items.length, "total:", total);
}

async function main() {
  try {
    console.log("Test 1: empty query");
    await testListMaterials({}, { visitorId: "test" });

    console.log("Test 2: with search");
    await testListMaterials({ q: "pdf" }, { visitorId: "test" });

    console.log("Test 3: favorited only");
    await testListMaterials({ favorited: "1" }, { visitorId: "test" });

    console.log("All OK");
  } catch (e) {
    console.error("ERROR:", e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
