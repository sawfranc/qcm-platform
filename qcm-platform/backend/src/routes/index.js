const express = require("express");
const authRoutes = require("./auth.routes");
const usersRoutes = require("./users.routes");
const domainsRoutes = require("./domains.routes");
const levelsRoutes = require("./levels.routes");
const questionsRoutes = require("./questions.routes");
const quizSessionsRoutes = require("./quizSessions.routes");
const paymentsRoutes = require("./payments.routes");
const payoutsRoutes = require("./payouts.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/domains", domainsRoutes);
router.use("/levels", levelsRoutes);
router.use("/questions", questionsRoutes);
router.use("/quiz-sessions", quizSessionsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/payouts", payoutsRoutes);

module.exports = router;
