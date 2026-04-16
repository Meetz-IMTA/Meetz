import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "user1@example.com" },
    update: {},
    create: {
      name: "Test User",
      email: "user1@example.com",
      password: hashedPassword,
      isVerified: true,
    },
  });

  console.log("Seed terminé :", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
