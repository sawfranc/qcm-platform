const prisma = require("../config/db");

async function myDomains(req, res, next) {
  try {
    const domains = await prisma.domain.findMany({
      where: { directorId: req.user.id },
      include: { themes: true },
    });
    res.json(domains);
  } catch (err) {
    next(err);
  }
}

async function createDomain(req, res, next) {
  try {
    const { name, description, directorId } = req.body;
    const domain = await prisma.domain.create({ data: { name, description, directorId } });
    res.status(201).json(domain);
  } catch (err) {
    next(err);
  }
}

async function listDomains(req, res, next) {
  try {
    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      include: { themes: true },
    });
    res.json(domains);
  } catch (err) {
    next(err);
  }
}

async function createTheme(req, res, next) {
  try {
    const { id: domainId } = req.params;
    const { name } = req.body;
    const theme = await prisma.theme.create({ data: { domainId, name } });
    res.status(201).json(theme);
  } catch (err) {
    next(err);
  }
}

async function assignTeacher(req, res, next) {
  try {
    const { id: domainId } = req.params;
    const { teacherId, themeId } = req.body;

    // Un directeur ne peut assigner un enseignant qu'à son propre domaine
    if (req.user.role === "directeur") {
      const domain = await prisma.domain.findUnique({ where: { id: domainId } });
      if (!domain || domain.directorId !== req.user.id) {
        return res.status(403).json({ error: "Vous ne pouvez assigner un enseignant qu'à votre propre domaine." });
      }
    }

    const assignment = await prisma.teacherAssignment.create({
      data: { domainId, teacherId, themeId, assignedById: req.user.id },
    });
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
}

module.exports = { createDomain, listDomains, myDomains, createTheme, assignTeacher };
