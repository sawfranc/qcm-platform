// Page d'accueil de chaque rôle
export const ROLE_HOME = {
  admin: "/admin",
  directeur: "/directeur",
  enseignant: "/enseignant",
  eleve: "/",
};

export const homeFor = (role) => ROLE_HOME[role] || "/login";
