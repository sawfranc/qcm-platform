const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/rbac.middleware");
const controller = require("../controllers/quizSessions.controller");

const router = express.Router();

router.use(authenticate, allowRoles("eleve"));

// Routes statiques d'abord (avant "/:id")
router.get("/dashboard", controller.dashboard);
router.get("/history", controller.history);
router.get("/availability", controller.availability);

router.post("/", controller.start);
router.get("/:id", controller.getOne);
router.post("/:id/answers", controller.answer);
router.post("/:id/complete", controller.complete);
router.get("/:id/result", controller.result);

module.exports = router;
