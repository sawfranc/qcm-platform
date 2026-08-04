# Plateforme de banque de QCM — Burkina Faso

Structure de projet complète (backend + frontend), directement issue de la spécification
fonctionnelle et technique établie précédemment (4 rôles, banque de questions validées,
sessions de test notées, abonnements/paiements, rémunération des enseignants).

```
qcm-platform/
├── backend/     → API REST Node.js/Express + Prisma/PostgreSQL (voir backend/README.md)
└── frontend/    → Application web React (Vite), interfaces des 4 rôles (voir frontend/README.md)
```

## Démarrage rapide

### 1. Backend
```bash
cd backend
cp .env.example .env      # renseigner DATABASE_URL et secrets JWT
npm install
npx prisma migrate dev --name init
npm run dev                # démarre sur http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env       # VITE_API_URL doit pointer vers l'API backend
npm install
npm run dev                # démarre sur http://localhost:5173
```

## Correspondance avec les documents précédents

| Document | Traduction dans le code |
|---|---|
| Modèle de données (spécification technique) | `backend/prisma/schema.prisma` |
| Endpoints API par ressource | `backend/src/routes/*.routes.js` |
| Logique métier (validation, scoring, paie) | `backend/src/services/*.service.js` |
| Sécurité (JWT, RBAC, hachage, webhooks signés) | `backend/src/middleware/*`, `backend/src/utils/*` |
| Parcours élève / enseignant / directeur / admin | `frontend/src/pages/{eleve,enseignant,directeur,admin}` |

## Ce qui reste à compléter avant la production

- Tests automatisés (unitaires sur les services, end-to-end sur les parcours critiques).
- Intégration réelle de l'agrégateur de paiement (CinetPay/PayDunya) dans `payment.service.js`.
- File de tâches asynchrones (ex. BullMQ + Redis) pour les paies mensuelles et les notifications SMS.
- Mise en place du mode hors-ligne côté application mobile (non couvert ici, le frontend fourni est la version web).
- Pipeline CI/CD (lint, tests, déploiement) — cf. le chronogramme fourni précédemment pour le calendrier recommandé.
