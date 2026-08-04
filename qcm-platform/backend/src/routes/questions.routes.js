const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/rbac.middleware");
const questionsController = require("../controllers/questions.controller");

const router = express.Router();

router.use(authenticate);
router.post("/", allowRoles("enseignant"), questionsController.create);
router.post("/:id/validate", allowRoles("directeur"), questionsController.validate);
router.post("/:id/reject", allowRoles("directeur"), questionsController.reject);
router.get("/", allowRoles("admin", "directeur", "enseignant"), questionsController.list);

module.exports = router;
