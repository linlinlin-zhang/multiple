import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  // 创建一条旧格式的用户素材
  const item = await prisma.materialItem.create({
    data: {
      visitorId: "test_visitor",
      fileName: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      hash: "abc123",
      filePath: "/storage/material/test.pdf",
      favorited: false
    }
  });
  console.log("Created item:", item.id, "source:", item.source);

  // 查询
  const list = await prisma.materialItem.findMany({
    where: {
      OR: [
        { visitorId: "test_visitor", source: "user" },
        { source: "system" }
      ]
    }
  });
  console.log("Listed:", list.length);

  // 清理
  await prisma.materialItem.delete({ where: { id: item.id } });
  console.log("Cleaned up");
}

test()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
