const payoutService = require("../services/payout.service");
const prisma = require("../config/db");

async function run(req, res, next) {
  try {
    const { periodStart, periodEnd } = req.body;
    const payouts = await payoutService.runPayoutsForPeriod({
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    });
    res.status(201).json(payouts);
  } catch (err) {
    next(err);
  }
}

async function myPayouts(req, res, next) {
  try {
    const payouts = await prisma.teacherPayout.findMany({
      where: { teacherId: req.user.id },
      orderBy: { periodStart: "desc" },
    });
    res.json(payouts);
  } catch (err) {
    next(err);
  }
}

module.exports = { run, myPayouts };
