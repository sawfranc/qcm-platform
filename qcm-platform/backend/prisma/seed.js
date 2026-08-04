const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  // 1. Compte administrateur central (le tout premier compte du système)
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@qcm.bf" },
    update: {},
    create: {
      fullName: "Administrateur Central",
      email: "admin@qcm.bf",
      passwordHash: adminPassword,
      role: "admin",
      status: "actif",
    },
  });
  console.log("✔ Admin créé :", admin.email, "/ mot de passe : Admin123!");

  // 2. Un niveau de test
  const level = await prisma.level.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Terminale",
      sortOrder: 1,
    },
  });
  console.log("✔ Niveau créé :", level.name);

  // 3. Un domaine de test
  const domain = await prisma.domain.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Mathématiques",
      description: "Domaine de test",
      directorId: admin.id, // l'admin est provisoirement directeur, à réassigner plus tard
    },
  });
  console.log("✔ Domaine créé :", domain.name);

  // 4. Une thématique de test
  const theme = await prisma.theme.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      domainId: domain.id,
      name: "Algèbre",
    },
  });
  console.log("✔ Thématique créée :", theme.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
