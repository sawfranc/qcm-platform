const prisma = require("../config/db");

/**
 * Crée une question avec ses options.
 * Règle métier : au moins 2 options, au moins une bonne réponse.
 */
async function createQuestion({ authorId, domainId, themeId, levelId, statement, explanation, difficulty, options }) {
  if (!options || options.length < 2) {
    const err = new Error("Une question doit comporter au moins 2 options.");
    err.status = 400;
    throw err;
  }
  if (!options.some((o) => o.isCorrect)) {
    const err = new Error("Au moins une option doit être marquée comme correcte.");
    err.status = 400;
    throw err;
  }

  // Vérifie que l'enseignant est bien assigné à ce domaine/thématique
  const assignment = await prisma.teacherAssignment.findFirst({
    where: { teacherId: authorId, domainId, OR: [{ themeId }, { themeId: null }] },
  });
  if (!assignment) {
    const err = new Error("Vous n'êtes pas assigné à ce domaine/thématique.");
    err.status = 403;
    throw err;
  }

  return prisma.question.create({
    data: {
      authorId,
      domainId,
      themeId,
      levelId,
      statement,
      explanation,
      difficulty: difficulty || 2,
      status: "en_attente",
      options: {
        create: options.map((o, i) => ({
          label: o.label,
          isCorrect: !!o.isCorrect,
          sortOrder: i,
        })),
      },
    },
    include: { options: true },
  });
}

/**
 * Validation par un directeur : uniquement sur son propre domaine.
 */
async function validateQuestion({ questionId, directorId }) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { domain: true },
  });
  if (!question) {
    const err = new Error("Question introuvable.");
    err.status = 404;
    throw err;
  }
  if (question.domain.directorId !== directorId) {
    const err = new Error("Vous ne pouvez valider que les questions de votre domaine.");
    err.status = 403;
    throw err;
  }

  return prisma.question.update({
    where: { id: questionId },
    data: { status: "validee", reviewedById: directorId, reviewedAt: new Date() },
  });
}

async function rejectQuestion({ questionId, directorId, reason }) {
  return prisma.question.update({
    where: { id: questionId },
    data: {
      status: "rejetee",
      reviewedById: directorId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
  });
}

module.exports = { createQuestion, validateQuestion, rejectQuestion };
