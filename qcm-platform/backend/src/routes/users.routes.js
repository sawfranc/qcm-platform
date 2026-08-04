const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/rbac.middleware");
const usersController = require("../controllers/users.controller");

const router = express.Router();

router.use(authenticate);
router.post("/", allowRoles("admin", "directeur"), usersController.createUser);
router.get("/", allowRoles("admin", "directeur"), usersController.listUsers);
router.post("/:id/suspend", allowRoles("admin", "directeur"), usersController.suspendUser);

module.exports = router;
