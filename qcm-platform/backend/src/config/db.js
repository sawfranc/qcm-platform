const { PrismaClient } = require("@prisma/client");

// Instance unique du client Prisma partagée dans toute l'application
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

module.exports = prisma;
