const prisma = require("../config/db");

function describe(student, subscription) {
  const unlimited = subscription ? subscription.questionsQuota === null : false;
  return {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    phone: student.phone,
    status: student.status,
    createdAt: student.createdAt,
    plan: subscription?.plan || null,
    quota: subscription ? subscription.questionsQuota : 0,
    used: subscription?.questionsUsed || 0,
    unlimited,
    remaining: subscription && !unlimited ? Math.max(0, subscription.questionsQuota - subscription.questionsUsed) : unlimited ? null : 0,
  };
}

// Liste des élèves avec leur quota de questions
async function listStudents(req, res, next) {
  try {
    const students = await prisma.user.findMany({
      where: { role: "eleve" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        subscriptions: { where: { isActive: true }, orderBy: { startsAt: "desc" }, take: 1 },
      },
    });
    res.json(students.map((s) => describe(s, s.subscriptions[0])));
  } catch (err) {
    next(err);
  }
}

// Affecte un nombre maximum de questions à un élève (null = illimité)
async function setQuota(req, res, next) {
  try {
    const { id } = req.params;
    const { quota, resetUsed } = req.body;

    const unlimited = quota === null;
    if (!unlimited && (!Number.isInteger(quota) || quota < 0 || quota > 1000000)) {
      return res.status(400).json({ error: "Le quota doit être un entier positif, ou null pour illimité." });
    }

    const student = await prisma.user.findFirst({ where: { id, role: "eleve" } });
    if (!student) return res.status(404).json({ error: "Élève introuvable." });

    const current = await prisma.subscription.findFirst({
      where: { userId: id, isActive: true },
      orderBy: { startsAt: "desc" },
    });

    const subscription = current
      ? await prisma.subscription.update({
          where: { id: current.id },
          data: { questionsQuota: quota, ...(resetUsed && { questionsUsed: 0 }) },
        })
      : await prisma.subscription.create({
          data: { userId: id, plan: unlimited ? "illimite" : "gratuit", questionsQuota: quota, isActive: true },
        });

    res.json(describe(student, subscription));
  } catch (err) {
    next(err);
  }
}

module.exports = { listStudents, setQuota };
