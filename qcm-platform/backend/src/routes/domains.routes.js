const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/rbac.middleware");
const domainsController = require("../controllers/domains.controller");

const router = express.Router();

router.get("/", domainsController.listDomains); // public : liste des domaines actifs
router.get("/mine", authenticate, allowRoles("directeur"), domainsController.myDomains);
router.post("/", authenticate, allowRoles("admin"), domainsController.createDomain);
router.post("/:id/themes", authenticate, allowRoles("admin", "directeur"), domainsController.createTheme);
router.post("/:id/assign-teacher", authenticate, allowRoles("directeur"), domainsController.assignTeacher);

module.exports = router;
