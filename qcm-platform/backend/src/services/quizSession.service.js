const prisma = require("../config/db");

const SUCCESS_THRESHOLD = 0.6; // en dessous de 60% de réussite sur une thématique -> conseils renforcés

/**
 * Démarre une session : vérifie le quota, tire des questions validées.
 */
async function startSession({ studentId, domainId, themeId, levelId, questionCount }) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId: studentId, isActive: true },
    orderBy: { startsAt: "desc" },
  });

  if (!subscription) {
    const err = new Error("Aucun abonnement actif. Veuillez souscrire une formule.");
    err.status = 402;
    throw err;
  }

  const isUnlimited = subscription.questionsQuota === null;
  const remaining = isUnlimited ? Infinity : subscription.questionsQuota - subscription.questionsUsed;

  if (remaining < questionCount) {
    const err = new Error("Quota de questions insuffisant. Veuillez recharger votre compte.");
    err.status = 402;
    throw err;
  }

  const questions = await prisma.question.findMany({
    where: {
      domainId,
      ...(themeId && { themeId }),
      ...(levelId && { levelId }),
      status: "validee",
    },
    include: { options: true },
    take: questionCount * 3, // sur-échantillonnage pour permettre un tirage aléatoire varié
  });

  if (questions.length < questionCount) {
    const err = new Error("Pas assez de questions disponibles pour ces critères.");
    err.status = 409;
    throw err;
  }

  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, questionCount);

  const session = await prisma.quizSession.create({
    data: {
      studentId,
      domainId,
      themeId,
      levelId,
      questionCount,
      status: "en_cours",
    },
  });

  // Les options correctes ne sont jamais renvoyées au client à ce stade
  const safeQuestions = shuffled.map((q) => ({
    id: q.id,
    statement: q.statement,
    difficulty: q.difficulty,
    options: q.options.map((o) => ({ id: o.id, label: o.label })),
  }));

  return { session, questions: safeQuestions, subscriptionId: subscription.id };
}

async function submitAnswer({ sessionId, questionId, selectedOptionId }) {
  const option = selectedOptionId
    ? await prisma.questionOption.findUnique({ where: { id: selectedOptionId } })
    : null;

  const isCorrect = option ? option.isCorrect : false;

  return prisma.sessionAnswer.create({
    data: { sessionId, questionId, selectedOptionId, isCorrect },
  });
}

/**
 * Clôture une session : calcule le score, met à jour les statistiques
 * des questions utilisées, décrémente le quota, et génère des conseils
 * + références documentaires pour les thématiques faibles.
 */
async function completeSession({ sessionId, studentId, subscriptionId }) {
  const answers = await prisma.sessionAnswer.findMany({
    where: { sessionId },
    include: { question: { include: { theme: true, references: true } } },
  });

  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const score = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

  await prisma.quizSession.update({
    where: { id: sessionId },
    data: { status: "terminee", completedAt: new Date(), score },
  });

  // Mise à jour des statistiques d'usage de chaque question
  for (const a of answers) {
    const q = a.question;
    const newUsage = q.usageCount + 1;
    const previousCorrectTotal = (q.successRate || 0) * q.usageCount;
    const newSuccessRate = (previousCorrectTotal + (a.isCorrect ? 1 : 0)) / newUsage;
    await prisma.question.update({
      where: { id: q.id },
      data: { usageCount: newUsage, successRate: newSuccessRate },
    });
  }

  // Décrément du quota
  if (subscriptionId) {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { questionsUsed: { increment: total } },
    });
  }

  // Regroupement par thématique pour générer les conseils
  const byTheme = {};
  for (const a of answers) {
    const themeName = a.question.theme?.name || "Général";
    byTheme[themeName] = byTheme[themeName] || { total: 0, correct: 0, references: new Set() };
    byTheme[themeName].total += 1;
    if (a.isCorrect) byTheme[themeName].correct += 1;
    if (!a.isCorrect) {
      a.question.references.forEach((r) => byTheme[themeName].references.add(r.title));
    }
  }

  const advice = Object.entries(byTheme).map(([theme, stats]) => ({
    theme,
    successRate: Math.round((stats.correct / stats.total) * 100),
    needsReview: stats.correct / stats.total < SUCCESS_THRESHOLD,
    recommendedReferences: Array.from(stats.references),
  }));

  return { score, total, correct, advice };
}

module.exports = { startSession, submitAnswer, completeSession };
