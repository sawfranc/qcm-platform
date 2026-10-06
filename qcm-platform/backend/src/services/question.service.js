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

/* ------------------------------------------------------------------ */
/* Import en masse (fichier Excel / CSV déjà lu côté navigateur)       */
/* ------------------------------------------------------------------ */

const MAX_IMPORT_ROWS = 200;
const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d"];
const LETTERS = ["A", "B", "C", "D"];

// Comparaison tolérante : sans accents, sans casse, espaces et apostrophes normalisés
function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const text = (v) => String(v ?? "").trim();

/**
 * Vérifie chaque ligne puis (si dryRun = false) crée les lignes valides, statut "en_attente".
 * rows : [{ matiere, thematique, niveau, enonce, option_a..option_d, bonne_reponse, explication, difficulte }]
 */
async function importQuestions({ authorId, rows, dryRun = true, createMissingLevels = false }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error("Le fichier ne contient aucune question.");
    err.status = 400;
    throw err;
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    const err = new Error(`Maximum ${MAX_IMPORT_ROWS} questions par import (le fichier en contient ${rows.length}).`);
    err.status = 400;
    throw err;
  }

  const [domains, levels, assignments] = await Promise.all([
    prisma.domain.findMany({ where: { isActive: true }, include: { themes: true } }),
    prisma.level.findMany(),
    prisma.teacherAssignment.findMany({ where: { teacherId: authorId } }),
  ]);

  const domainByName = new Map(domains.map((d) => [norm(d.name), d]));
  const levelByName = new Map(levels.map((l) => [norm(l.name), l]));
  const newLevels = new Map(); // niveaux à créer : nom normalisé -> libellé d'origine

  // Doublons déjà présents en base (même domaine + thématique + niveau + énoncé)
  const usedDomainIds = [...new Set(rows.map((r) => domainByName.get(norm(r.matiere))?.id).filter(Boolean))];
  const existing = usedDomainIds.length
    ? await prisma.question.findMany({
        where: { domainId: { in: usedDomainIds }, status: { not: "rejetee" } },
        select: { domainId: true, themeId: true, levelId: true, statement: true },
      })
    : [];
  const existingKeys = new Set(existing.map((q) => `${q.domainId}|${q.themeId}|${q.levelId}|${norm(q.statement)}`));
  const fileKeys = new Set();

  const report = [];
  const toCreate = [];

  rows.forEach((row, index) => {
    const line = index + 2; // ligne 1 = en-têtes dans le fichier
    const errors = [];

    const matiere = text(row.matiere);
    const thematique = text(row.thematique);
    const niveau = text(row.niveau);
    const enonce = text(row.enonce);
    const explication = text(row.explication);

    if (!matiere) errors.push("matière manquante");
    if (!thematique) errors.push("thématique manquante");
    if (!niveau) errors.push("niveau manquant");
    if (!enonce) errors.push("énoncé manquant");
    else if (enonce.length > 2000) errors.push("énoncé trop long (max. 2000 caractères)");
    if (explication.length > 3000) errors.push("explication trop longue (max. 3000 caractères)");

    // Matière, thématique, niveau
    const domain = matiere ? domainByName.get(norm(matiere)) : null;
    if (matiere && !domain) errors.push(`matière « ${matiere} » inconnue`);

    const theme = domain && thematique ? domain.themes.find((t) => norm(t.name) === norm(thematique)) : null;
    if (domain && thematique && !theme) errors.push(`thématique « ${thematique} » inconnue dans la matière « ${domain.name} »`);

    let level = niveau ? levelByName.get(norm(niveau)) : null;
    let levelToCreate = null;
    if (niveau && !level) {
      if (createMissingLevels) levelToCreate = niveau;
      else errors.push(`niveau « ${niveau} » inconnu`);
    }

    // Droit de l'enseignant sur cette matière / thématique
    if (domain && theme) {
      const allowed = assignments.some((a) => a.domainId === domain.id && (a.themeId === null || a.themeId === theme.id));
      if (!allowed) errors.push("vous n'êtes pas assigné à cette matière / thématique");
    }

    // Options
    const options = OPTION_KEYS.map((k, i) => ({ letter: LETTERS[i], label: text(row[k]) }));
    const filled = options.filter((o) => o.label);
    // Une option vide ne peut pas être suivie d'une option remplie (ex. A, B, D sans C)
    const firstEmpty = options.findIndex((o) => !o.label);
    if (firstEmpty !== -1 && options.slice(firstEmpty).some((o) => o.label)) {
      errors.push("options non consécutives (une option vide précède une option remplie)");
    }
    if (filled.length < 2) errors.push("au moins 2 options sont nécessaires");
    if (filled.some((o) => o.label.length > 500)) errors.push("une option dépasse 500 caractères");
    const labels = filled.map((o) => norm(o.label));
    if (new Set(labels).size !== labels.length) errors.push("deux options sont identiques");

    // Bonne(s) réponse(s) : « B » ou « A,C »
    const rawAnswer = text(row.bonne_reponse).toUpperCase().replace(/[^A-D]/g, "");
    const correctLetters = [...new Set(rawAnswer.split(""))];
    if (!text(row.bonne_reponse)) errors.push("bonne réponse manquante");
    else if (correctLetters.length === 0) errors.push(`bonne réponse « ${text(row.bonne_reponse)} » invalide (attendu : A, B, C ou D)`);
    else if (correctLetters.some((l) => !filled.find((o) => o.letter === l))) errors.push("la bonne réponse désigne une option vide");

    // Difficulté
    let difficulty = 2;
    if (text(row.difficulte) !== "") {
      difficulty = Number(text(row.difficulte));
      if (![1, 2, 3].includes(difficulty)) errors.push("difficulté invalide (attendu : 1, 2 ou 3)");
    }

    // Doublons
    if (domain && theme && level && enonce) {
      const key = `${domain.id}|${theme.id}|${level.id}|${norm(enonce)}`;
      if (existingKeys.has(key)) errors.push("question déjà présente dans la banque");
      else if (fileKeys.has(key)) errors.push("doublon d'une autre ligne du fichier");
      else if (errors.length === 0) fileKeys.add(key);
    } else if (domain && theme && levelToCreate && enonce) {
      const key = `${domain.id}|${theme.id}|new:${norm(levelToCreate)}|${norm(enonce)}`;
      if (fileKeys.has(key)) errors.push("doublon d'une autre ligne du fichier");
      else if (errors.length === 0) fileKeys.add(key);
    }

    const item = { line, statement: enonce.slice(0, 140), ok: errors.length === 0, errors };
    if (levelToCreate && errors.length === 0) {
      item.note = `le niveau « ${levelToCreate} » sera créé`;
      newLevels.set(norm(levelToCreate), levelToCreate);
    }
    report.push(item);

    if (errors.length === 0) {
      toCreate.push({
        domainId: domain.id,
        themeId: theme.id,
        levelId: level?.id || null,
        levelKey: levelToCreate ? norm(levelToCreate) : null,
        statement: enonce,
        explanation: explication || null,
        difficulty,
        options: filled.map((o, i) => ({ label: o.label, isCorrect: correctLetters.includes(o.letter), sortOrder: i })),
      });
    }
  });

  const summary = {
    total: rows.length,
    valid: toCreate.length,
    invalid: rows.length - toCreate.length,
    newLevels: [...newLevels.values()],
  };

  if (dryRun || toCreate.length === 0) {
    return { dryRun: true, imported: 0, ...summary, report };
  }

  // Création des niveaux manquants puis des questions, en une seule transaction
  await prisma.$transaction(async (tx) => {
    const maxOrder = (await tx.level.aggregate({ _max: { sortOrder: true } }))._max.sortOrder || 0;
    let order = maxOrder;
    const createdLevelIds = new Map();
    for (const [key, label] of newLevels) {
      const lvl = await tx.level.create({ data: { name: label, sortOrder: ++order } });
      createdLevelIds.set(key, lvl.id);
    }
    await Promise.all(
      toCreate.map((q) =>
        tx.question.create({
          data: {
            authorId,
            domainId: q.domainId,
            themeId: q.themeId,
            levelId: q.levelId || createdLevelIds.get(q.levelKey),
            statement: q.statement,
            explanation: q.explanation,
            difficulty: q.difficulty,
            status: "en_attente",
            options: { create: q.options },
          },
        })
      )
    );
  }, { timeout: 30000 });

  return { dryRun: false, imported: toCreate.length, ...summary, report };
}

module.exports = { createQuestion, validateQuestion, rejectQuestion, importQuestions };
