const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/rbac.middleware");
const controller = require("../controllers/quizSessions.controller");

const router = express.Router();

router.use(authenticate, allowRoles("eleve"));
router.post("/", controller.start);
router.post("/:id/answers", controller.answer);
router.post("/:id/complete", controller.complete);

module.exports = router;
