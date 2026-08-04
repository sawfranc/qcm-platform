const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/rbac.middleware");
const controller = require("../controllers/payouts.controller");

const router = express.Router();

router.use(authenticate);
router.post("/run", allowRoles("admin"), controller.run);
router.get("/me", allowRoles("enseignant"), controller.myPayouts);

module.exports = router;
