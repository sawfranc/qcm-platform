/**
 * Autorise uniquement les rôles listés à accéder à la route.
 * Usage : router.post('/domains', authenticate, allowRoles('admin'), handler)
 */
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé pour ce rôle." });
    }
    next();
  };
}

module.exports = { allowRoles };
