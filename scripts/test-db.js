import { prisma } from "../src/lib/prisma.js";

async function main() {
  const result = await prisma.$queryRaw`SELECT 1 as test`;
  console.log(JSON.stringify(result));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Database test failed:", err.message);
  process.exit(1);
});
