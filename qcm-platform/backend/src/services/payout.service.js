const prisma = require("../config/db");

const TARIF_UNITAIRE = 100; // FCFA par question validée (exemple, configurable)
const TAUX_BONUS_USAGE = 5; // FCFA par utilisation réussie supplémentaire (exemple)

/**
 * Calcule et enregistre la rémunération de chaque enseignant sur une période donnée.
 * À exécuter via une tâche planifiée mensuelle (cron / job queue).
 */
async function runPayoutsForPeriod({ periodStart, periodEnd }) {
  const teachers = await prisma.user.findMany({ where: { role: "enseignant", status: "actif" } });
  const results = [];

  for (const teacher of teachers) {
    const validatedQuestions = await prisma.question.findMany({
      where: {
        authorId: teacher.id,
        status: "validee",
        reviewedAt: { gte: periodStart, lte: periodEnd },
      },
    });

    if (validatedQuestions.length === 0) continue;

    const baseAmount = validatedQuestions.length * TARIF_UNITAIRE;
    const usageBonus = validatedQuestions.reduce(
      (sum, q) => sum + q.usageCount * TAUX_BONUS_USAGE,
      0
    );
    const totalAmount = baseAmount + usageBonus;

    const payout = await prisma.teacherPayout.create({
      data: {
        teacherId: teacher.id,
        periodStart,
        periodEnd,
        validatedQuestions: validatedQuestions.length,
        usageBonus,
        baseAmount,
        totalAmount,
        status: "en_attente",
      },
    });

    results.push(payout);
    // TODO: déclencher ici le virement Mobile Money via le service de paiement,
    // puis passer payout.status à 'paye' une fois la confirmation reçue.
  }

  return results;
}

module.exports = { runPayoutsForPeriod };
