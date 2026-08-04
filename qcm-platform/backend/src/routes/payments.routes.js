const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/rbac.middleware");
const controller = require("../controllers/payments.controller");

const router = express.Router();

// CinetPay poste en x-www-form-urlencoded : middleware dédié sur cette seule route
router.post(
  "/webhook",
  express.urlencoded({ extended: true }),
  controller.webhook
);

router.post("/initiate", authenticate, allowRoles("eleve"), controller.initiate);

module.exports = router;
