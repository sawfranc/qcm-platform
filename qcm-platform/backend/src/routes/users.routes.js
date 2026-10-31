const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/rbac.middleware");
const usersController = require("../controllers/users.controller");
const studentsController = require("../controllers/students.controller");

const router = express.Router();

router.use(authenticate);
router.post("/", allowRoles("admin", "directeur"), usersController.createUser);
router.get("/", allowRoles("admin", "directeur"), usersController.listUsers);
// Quota de questions par élève (admin central uniquement)
router.get("/students", allowRoles("admin"), studentsController.listStudents);
router.put("/:id/quota", allowRoles("admin"), studentsController.setQuota);
router.put("/:id/assignments", allowRoles("admin", "directeur"), usersController.setTeacherAssignments);
router.post("/:id/suspend", allowRoles("admin", "directeur"), usersController.suspendUser);

module.exports = router;
