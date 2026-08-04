const prisma = require("../config/db");
const { hashPassword } = require("../utils/password");

/**
 * Crée un compte enseignant ou directeur.
 * - admin peut créer un directeur ou un enseignant
 * - directeur ne peut créer que des enseignants, rattachés à son propre domaine
 */
async function createUser(req, res, next) {
  try {
    const { fullName, email, phone, password, role, domainId } = req.body;
    const requester = req.user;

    if (requester.role === "directeur" && role !== "enseignant") {
      return res.status(403).json({ error: "Un directeur ne peut créer que des comptes enseignants." });
    }
    if (requester.role === "directeur") {
      if (!domainId) {
        return res.status(400).json({ error: "Le domaine est obligatoire pour créer un enseignant." });
      }
      const domain = await prisma.domain.findUnique({ where: { id: domainId } });
      if (!domain || domain.directorId !== requester.id) {
        return res.status(403).json({ error: "Vous ne pouvez créer un enseignant que pour votre propre domaine." });
      }
    }
    if (requester.role === "admin" && !["directeur", "enseignant"].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide pour une création manuelle." });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        fullName,
        email: email || undefined,
        phone: phone || undefined, // "" doit être traité comme "pas de téléphone", pas comme une valeur dupliquée
        passwordHash,
        role,
        createdById: requester.id,
      },
    });

    if (role === "enseignant" && domainId) {
      await prisma.teacherAssignment.create({
        data: { teacherId: user.id, domainId, assignedById: requester.id },
      });
    }

    res.status(201).json({ id: user.id, fullName: user.fullName, role: user.role });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const requester = req.user;
    const where =
      requester.role === "admin"
        ? {}
        : { createdById: requester.id }; // un directeur ne voit que les comptes qu'il a créés

    const users = await prisma.user.findMany({
      where,
      select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function suspendUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({ where: { id }, data: { status: "suspendu" } });
    res.json({ id: user.id, status: user.status });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUser, listUsers, suspendUser };
