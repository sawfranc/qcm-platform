const prisma = require("../config/db");

const SUCCESS_THRESHOLD = 0.6; // en dessous de 60 % de réussite sur une thématique -> à retravailler
const MAX_QUESTIONS_PER_TEST = 50;
const MAX_TIME_LIMIT_MINUTES = 240;

function httpError(status, message, extra) {
  const err = new Error(message);
  err.status = status;
  if (extra) Object.assign(err, extra);
  return err;
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const round2 = (n) => Math.round(n * 100) / 100;
const toNote20 = (scorePercent) => (scorePercent == null ? null : round2(scorePercent / 5));

function cleanIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v) => typeof v === "string" && v.length > 0))];
}

/* ------------------------------------------------------------------ */
/* Quota                                                               */
/* ------------------------------------------------------------------ */

async function getActiveSubscription(studentId) {
  return prisma.subscription.findFirst({
    where: { userId: studentId, isActive: true },
    orderBy: { startsAt: "desc" },
  });
}

function describeQuota(subscription) {
  if (!subscription) {
    return { plan: null, total: 0, used: 0, remaining: 0, unlimited: false };
  }
  const unlimited = subscription.questionsQuota === null;
  return {
    plan: subscription.plan,
    total: unlimited ? null : subscription.questionsQuota,
    used: subscription.questionsUsed,
    remaining: unlimited ? null : Math.max(0, subscription.questionsQuota - subscription.questionsUsed),
    unlimited,
  };
}

async function getQuota(studentId) {
  return describeQuota(await getActiveSubscription(studentId));
}

/* ------------------------------------------------------------------ */
/* Filtres (domaines / thématiques / niveaux)                          */
/* ------------------------------------------------------------------ */

function buildQuestionWhere({ domainIds, themeIds, levelIds }) {
  return {
    status: "validee",
    ...(domainIds.length && { domainId: { in: domainIds } }),
    ...(themeIds.length && { themeId: { in: themeIds } }),
    ...(levelIds.length && { levelId: { in: levelIds } }),
  };
}

async function countAvailable({ domainIds, themeIds, levelIds }) {
  return prisma.question.count({
    where: buildQuestionWhere({
      domainIds: cleanIds(domainIds),
      themeIds: cleanIds(themeIds),
      levelIds: cleanIds(levelIds),
    }),
  });
}

/* ------------------------------------------------------------------ */
/* Démarrage                                                           */
/* ------------------------------------------------------------------ */

async function startSession({ studentId, domainIds, themeIds, levelIds, questionCount, timeLimitMinutes }) {
  domainIds = cleanIds(domainIds);
  themeIds = cleanIds(themeIds);
  levelIds = cleanIds(levelIds);

  const count = Number(questionCount);
  if (!Number.isInteger(count) || count < 1 || count > MAX_QUESTIONS_PER_TEST) {
    throw httpError(400, `Le nombre de questions doit être compris entre 1 et ${MAX_QUESTIONS_PER_TEST}.`);
  }

  let limit = null;
  if (timeLimitMinutes !== undefined && timeLimitMinutes !== null && timeLimitMinutes !== "") {
    limit = Number(timeLimitMinutes);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_TIME_LIMIT_MINUTES) {
      throw httpError(400, `La limite de temps doit être comprise entre 1 et ${MAX_TIME_LIMIT_MINUTES} minutes.`);
    }
  }

  // 1. Quota imposé à l'étudiant
  const subscription = await getActiveSubscription(studentId);
  if (!subscription) {
    throw httpError(402, "Aucun quota actif. Contactez l'administration pour obtenir un quota de questions.");
  }
  const quota = describeQuota(subscription);
  if (!quota.unlimited && quota.remaining < count) {
    throw httpError(
      402,
      quota.remaining === 0
        ? "Votre quota de questions est épuisé. Contactez l'administration pour le recharger."
        : `Votre quota restant est de ${quota.remaining} question(s). Réduisez le nombre de questions.`,
      { remaining: quota.remaining }
    );
  }

  // 2. Questions éligibles
  const candidates = await prisma.question.findMany({
    where: buildQuestionWhere({ domainIds, themeIds, levelIds }),
    select: { id: true },
  });

  if (candidates.length < count) {
    throw httpError(
      409,
      candidates.length === 0
        ? "Aucune question disponible pour ces critères."
        : `Seulement ${candidates.length} question(s) disponible(s) pour ces critères.`,
      { available: candidates.length }
    );
  }

  // 3. Tirage aléatoire uniforme, en privilégiant les questions jamais vues par l'étudiant
  const seenRows = await prisma.sessionAnswer.findMany({
    where: { session: { studentId }, questionId: { in: candidates.map((c) => c.id) } },
    select: { questionId: true },
    distinct: ["questionId"],
  });
  const seen = new Set(seenRows.map((r) => r.questionId));
  const unseen = shuffle(candidates.filter((c) => !seen.has(c.id)));
  const alreadySeen = shuffle(candidates.filter((c) => seen.has(c.id)));
  const picked = [...unseen, ...alreadySeen].slice(0, count).map((c) => c.id);

  // 4. Libellés des filtres (conservés pour l'historique)
  const [domains, themes, levels] = await Promise.all([
    domainIds.length ? prisma.domain.findMany({ where: { id: { in: domainIds } }, select: { name: true } }) : [],
    themeIds.length ? prisma.theme.findMany({ where: { id: { in: themeIds } }, select: { name: true } }) : [],
    levelIds.length ? prisma.level.findMany({ where: { id: { in: levelIds } }, select: { name: true } }) : [],
  ]);

  const now = new Date();
  const session = await prisma.quizSession.create({
    data: {
      studentId,
      domainId: domainIds.length === 1 ? domainIds[0] : null,
      questionCount: count,
      timeLimitMinutes: limit,
      expiresAt: limit ? new Date(now.getTime() + limit * 60 * 1000) : null,
      questionIds: picked,
      filters: {
        domainIds,
        themeIds,
        levelIds,
        labels: {
          domains: domains.map((d) => d.name),
          themes: themes.map((t) => t.name),
          levels: levels.map((l) => l.name),
        },
      },
      status: "en_cours",
    },
  });

  const questions = await loadSafeQuestions(picked);
  return { session: publicSession(session), questions, answers: {} };
}

/* ------------------------------------------------------------------ */
/* Lecture d'une session en cours                                      */
/* ------------------------------------------------------------------ */

function publicSession(s) {
  return {
    id: s.id,
    status: s.status,
    questionCount: s.questionCount,
    timeLimitMinutes: s.timeLimitMinutes,
    startedAt: s.startedAt,
    expiresAt: s.expiresAt,
    completedAt: s.completedAt,
    serverTime: new Date().toISOString(),
    filters: s.filters?.labels || null,
  };
}

// Les bonnes réponses ne sont JAMAIS envoyées pendant le test
async function loadSafeQuestions(questionIds) {
  const rows = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  const byId = new Map(rows.map((q) => [q.id, q]));
  return questionIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((q) => ({
      id: q.id,
      statement: q.statement,
      difficulty: q.difficulty,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    }));
}

async function getOwnedSession(sessionId, studentId) {
  const session = await prisma.quizSession.findFirst({ where: { id: sessionId, studentId } });
  if (!session) throw httpError(404, "Session introuvable.");
  return session;
}

function isExpired(session) {
  return session.status === "en_cours" && session.expiresAt && session.expiresAt.getTime() < Date.now();
}

async function getSession({ sessionId, studentId }) {
  let session = await getOwnedSession(sessionId, studentId);

  if (isExpired(session)) {
    await finalizeSession(session);
    session = await getOwnedSession(sessionId, studentId);
  }

  if (session.status !== "en_cours") {
    return { session: publicSession(session), finished: true };
  }

  const [questions, answers] = await Promise.all([
    loadSafeQuestions(session.questionIds),
    prisma.sessionAnswer.findMany({ where: { sessionId }, select: { questionId: true, selectedOptionId: true } }),
  ]);

  return {
    session: publicSession(session),
    questions,
    answers: Object.fromEntries(answers.map((a) => [a.questionId, a.selectedOptionId])),
    finished: false,
  };
}

/* ------------------------------------------------------------------ */
/* Réponses                                                            */
/* ------------------------------------------------------------------ */

async function submitAnswer({ sessionId, studentId, questionId, selectedOptionId }) {
  const session = await getOwnedSession(sessionId, studentId);

  if (isExpired(session)) {
    await finalizeSession(session);
    throw httpError(410, "Le temps imparti est écoulé. Le test a été clôturé.");
  }
  if (session.status !== "en_cours") throw httpError(409, "Ce test est déjà terminé.");
  if (!session.questionIds.includes(questionId)) throw httpError(400, "Cette question ne fait pas partie du test.");
  if (!selectedOptionId) throw httpError(400, "Aucune réponse sélectionnée.");

  const option = await prisma.questionOption.findFirst({ where: { id: selectedOptionId, questionId } });
  if (!option) throw httpError(400, "Option invalide pour cette question.");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.sessionAnswer.findFirst({ where: { sessionId, questionId } });

    if (existing) {
      // L'étudiant change d'avis : pas de consommation de quota supplémentaire
      await tx.sessionAnswer.update({
        where: { id: existing.id },
        data: { selectedOptionId, isCorrect: option.isCorrect, answeredAt: new Date() },
      });
      return { saved: true };
    }

    // Première réponse à cette question : consomme 1 unité de quota
    const subscription = await tx.subscription.findFirst({
      where: { userId: studentId, isActive: true },
      orderBy: { startsAt: "desc" },
    });
    if (!subscription) throw httpError(402, "Aucun quota actif.");
    if (subscription.questionsQuota !== null && subscription.questionsUsed >= subscription.questionsQuota) {
      throw httpError(402, "Votre quota de questions est épuisé.");
    }

    await tx.sessionAnswer.create({
      data: { sessionId, questionId, selectedOptionId, isCorrect: option.isCorrect },
    });
    await tx.subscription.update({
      where: { id: subscription.id },
      data: { questionsUsed: { increment: 1 } },
    });
    return { saved: true };
  });
}

/* ------------------------------------------------------------------ */
/* Clôture                                                             */
/* ------------------------------------------------------------------ */

// Idempotent : seule la première clôture met à jour score et statistiques
async function finalizeSession(session) {
  const claimed = await prisma.quizSession.updateMany({
    where: { id: session.id, status: "en_cours" },
    data: { status: "terminee", completedAt: new Date() },
  });
  if (claimed.count === 0) return; // déjà clôturée par un autre appel

  const answers = await prisma.sessionAnswer.findMany({
    where: { sessionId: session.id },
    include: { question: { select: { id: true, usageCount: true, successRate: true } } },
  });

  const correct = answers.filter((a) => a.isCorrect).length;
  // Les questions sans réponse comptent comme fausses
  const score = session.questionCount > 0 ? round2((correct / session.questionCount) * 100) : 0;

  await prisma.quizSession.update({ where: { id: session.id }, data: { score } });

  for (const a of answers) {
    const q = a.question;
    const newUsage = q.usageCount + 1;
    const newRate = ((q.successRate || 0) * q.usageCount + (a.isCorrect ? 1 : 0)) / newUsage;
    await prisma.question.update({ where: { id: q.id }, data: { usageCount: newUsage, successRate: newRate } });
  }
}

async function completeSession({ sessionId, studentId }) {
  const session = await getOwnedSession(sessionId, studentId);
  if (session.status === "en_cours") await finalizeSession(session);
  return getResult({ sessionId, studentId });
}

/* ------------------------------------------------------------------ */
/* Résultat détaillé                                                   */
/* ------------------------------------------------------------------ */

async function getResult({ sessionId, studentId }) {
  let session = await getOwnedSession(sessionId, studentId);
  if (isExpired(session)) {
    await finalizeSession(session);
    session = await getOwnedSession(sessionId, studentId);
  }
  if (session.status === "en_cours") throw httpError(409, "Ce test n'est pas encore terminé.");

  const [answers, questions] = await Promise.all([
    prisma.sessionAnswer.findMany({ where: { sessionId } }),
    prisma.question.findMany({
      where: { id: { in: session.questionIds } },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
        theme: { include: { references: true } },
        domain: { select: { name: true } },
        references: true,
      },
    }),
  ]);

  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const ordered = session.questionIds.map((id) => questionById.get(id)).filter(Boolean);

  const correct = answers.filter((a) => a.isCorrect).length;
  const score = session.score ?? 0;

  const review = ordered.map((q) => {
    const a = answerByQuestion.get(q.id);
    return {
      id: q.id,
      statement: q.statement,
      explanation: q.explanation,
      theme: q.theme?.name || "Général",
      domain: q.domain?.name || null,
      selectedOptionId: a?.selectedOptionId || null,
      isCorrect: a ? !!a.isCorrect : false,
      answered: !!a,
      options: q.options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect })),
    };
  });

  // Conseils par thématique
  const byTheme = new Map();
  for (const q of ordered) {
    const a = answerByQuestion.get(q.id);
    const key = q.theme?.name || "Général";
    if (!byTheme.has(key)) byTheme.set(key, { total: 0, correct: 0, references: new Map() });
    const entry = byTheme.get(key);
    entry.total += 1;
    if (a?.isCorrect) {
      entry.correct += 1;
    } else {
      [...q.references, ...(q.theme?.references || [])].forEach((r) => {
        entry.references.set(r.id, { title: r.title, url: r.externalUrl || r.fileUrl || null });
      });
    }
  }

  const advice = [...byTheme.entries()].map(([theme, s]) => ({
    theme,
    total: s.total,
    correct: s.correct,
    successRate: Math.round((s.correct / s.total) * 100),
    needsReview: s.correct / s.total < SUCCESS_THRESHOLD,
    recommendedReferences: [...s.references.values()],
  }));

  const durationSeconds = session.completedAt
    ? Math.max(0, Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / 1000))
    : null;

  return {
    session: publicSession(session),
    score,
    note20: toNote20(score),
    total: session.questionCount,
    answered: answers.length,
    unanswered: Math.max(0, session.questionCount - answers.length),
    correct,
    durationSeconds,
    timedOut: !!(session.expiresAt && session.completedAt && session.completedAt >= session.expiresAt),
    advice,
    review,
  };
}

/* ------------------------------------------------------------------ */
/* Historique                                                          */
/* ------------------------------------------------------------------ */

async function finalizeExpiredSessions(studentId) {
  const expired = await prisma.quizSession.findMany({
    where: { studentId, status: "en_cours", expiresAt: { lt: new Date() } },
  });
  for (const s of expired) await finalizeSession(s);
}

async function getHistory({ studentId }) {
  await finalizeExpiredSessions(studentId);

  const sessions = await prisma.quizSession.findMany({
    where: { studentId },
    orderBy: { startedAt: "desc" },
    take: 200,
    include: { answers: { select: { isCorrect: true } } },
  });

  return sessions.map((s) => ({
    id: s.id,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    questionCount: s.questionCount,
    answered: s.answers.length,
    correct: s.answers.filter((a) => a.isCorrect).length,
    score: s.score,
    note20: toNote20(s.score),
    timeLimitMinutes: s.timeLimitMinutes,
    expiresAt: s.expiresAt,
    filters: s.filters?.labels || null,
    resumable: s.status === "en_cours",
  }));
}

/* ------------------------------------------------------------------ */
/* Tableau de bord personnalisé                                        */
/* ------------------------------------------------------------------ */

async function getDashboard({ studentId }) {
  await finalizeExpiredSessions(studentId);

  const [quota, finished, inProgress, answers] = await Promise.all([
    getQuota(studentId),
    prisma.quizSession.findMany({
      where: { studentId, status: "terminee" },
      orderBy: { startedAt: "asc" },
      select: { id: true, startedAt: true, completedAt: true, score: true, questionCount: true },
    }),
    prisma.quizSession.findFirst({
      where: { studentId, status: "en_cours" },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true, expiresAt: true, questionCount: true },
    }),
    prisma.sessionAnswer.findMany({
      where: { session: { studentId, status: "terminee" } },
      orderBy: { answeredAt: "desc" },
      take: 5000,
      select: {
        isCorrect: true,
        question: { select: { theme: { select: { name: true } }, domain: { select: { name: true } } } },
      },
    }),
  ]);

  const scores = finished.map((s) => s.score ?? 0);
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const averageScore = avg(scores);

  // Tendance : moyenne des 5 derniers tests vs les 5 précédents
  let trend = null;
  if (scores.length >= 2) {
    const last = scores.slice(-5);
    const before = scores.slice(-10, -5);
    if (before.length) trend = round2(avg(last) - avg(before));
    else trend = round2(scores[scores.length - 1] - scores[0]);
  }

  const progression = finished.slice(-20).map((s) => ({
    id: s.id,
    date: s.completedAt || s.startedAt,
    score: s.score ?? 0,
    note20: toNote20(s.score ?? 0),
  }));

  const group = (keyFn) => {
    const map = new Map();
    for (const a of answers) {
      const key = keyFn(a);
      if (!map.has(key)) map.set(key, { total: 0, correct: 0 });
      const e = map.get(key);
      e.total += 1;
      if (a.isCorrect) e.correct += 1;
    }
    return [...map.entries()]
      .map(([name, e]) => ({ name, total: e.total, correct: e.correct, successRate: Math.round((e.correct / e.total) * 100) }))
      .sort((a, b) => b.total - a.total);
  };

  const byTheme = group((a) => a.question.theme?.name || "Général");
  const byDomain = group((a) => a.question.domain?.name || "Général");
  const weakThemes = byTheme
    .filter((t) => t.total >= 3 && t.successRate < SUCCESS_THRESHOLD * 100)
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 5);

  return {
    quota,
    totals: {
      testsCompleted: finished.length,
      questionsAnswered: answers.length,
      averageScore: averageScore == null ? null : round2(averageScore),
      averageNote20: averageScore == null ? null : toNote20(averageScore),
      bestScore: scores.length ? Math.max(...scores) : null,
      bestNote20: scores.length ? toNote20(Math.max(...scores)) : null,
      lastScore: scores.length ? scores[scores.length - 1] : null,
      lastNote20: scores.length ? toNote20(scores[scores.length - 1]) : null,
      trend,
    },
    progression,
    byTheme,
    byDomain,
    weakThemes,
    inProgress,
  };
}

module.exports = {
  startSession,
  getSession,
  submitAnswer,
  completeSession,
  getResult,
  getHistory,
  getDashboard,
  getQuota,
  countAvailable,
};
