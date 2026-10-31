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
    let where = {};
    if (requester.role !== "admin") {
      // Un directeur voit les comptes qu'il a créés + les enseignants affectés à ses domaines
      where = {
        OR: [
          { createdById: requester.id },
          { teacherAssignments: { some: { domain: { directorId: requester.id } } } },
        ],
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true,
        teacherAssignments: {
          select: {
            id: true, domainId: true, themeId: true,
            domain: { select: { id: true, name: true, directorId: true } },
            theme: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/**
 * Remplace les affectations (domaine / thème) d'un enseignant.
 * body : { assignments: [{ domainId, themeId? }] }  (themeId absent = tout le domaine)
 * - admin : remplace l'ensemble des affectations de l'enseignant
 * - directeur : ne gère que les affectations de SES domaines (les autres sont conservées)
 */
async function setTeacherAssignments(req, res, next) {
  try {
    const { id: teacherId } = req.params;
    const requester = req.user;
    const incoming = Array.isArray(req.body.assignments) ? req.body.assignments : [];

    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.role !== "enseignant") {
      return res.status(404).json({ error: "Enseignant introuvable." });
    }

    // Dédoublonnage + normalisation
    const seen = new Set();
    const wanted = [];
    for (const a of incoming) {
      if (!a || !a.domainId) continue;
      const themeId = a.themeId || null;
      const key = `${a.domainId}|${themeId || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      wanted.push({ domainId: a.domainId, themeId });
    }

    const domainIds = [...new Set(wanted.map((w) => w.domainId))];
    const domains = await prisma.domain.findMany({
      where: { id: { in: domainIds } },
      include: { themes: { select: { id: true } } },
    });
    if (domains.length !== domainIds.length) {
      return res.status(400).json({ error: "Domaine inconnu." });
    }
    const byId = new Map(domains.map((d) => [d.id, d]));
    for (const w of wanted) {
      const d = byId.get(w.domainId);
      if (requester.role === "directeur" && d.directorId !== requester.id) {
        return res.status(403).json({ error: "Vous ne pouvez gérer que les affectations de vos propres domaines." });
      }
      if (w.themeId && !d.themes.some((t) => t.id === w.themeId)) {
        return res.status(400).json({ error: "Ce thème n'appartient pas au domaine indiqué." });
      }
    }

    // Périmètre de remplacement : tout pour l'admin, uniquement ses domaines pour un directeur
    const scope =
      requester.role === "admin"
        ? { teacherId }
        : { teacherId, domain: { directorId: requester.id } };

    await prisma.$transaction([
      prisma.teacherAssignment.deleteMany({ where: scope }),
      prisma.teacherAssignment.createMany({
        data: wanted.map((w) => ({ teacherId, domainId: w.domainId, themeId: w.themeId, assignedById: requester.id })),
      }),
    ]);

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId },
      select: {
        id: true, domainId: true, themeId: true,
        domain: { select: { id: true, name: true, directorId: true } },
        theme: { select: { id: true, name: true } },
      },
    });
    res.json({ teacherId, assignments });
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

module.exports = { createUser, listUsers, suspendUser, setTeacherAssignments };
