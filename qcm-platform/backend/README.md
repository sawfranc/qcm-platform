# Backend — Plateforme QCM

API REST (Node.js/Express + Prisma/PostgreSQL) reprenant fidèlement le modèle de données,
l'API et la logique métier décrits dans la spécification technique du projet.

## Structure

```
backend/
├── prisma/
│   └── schema.prisma        # Modèle de données complet (users, domains, questions, sessions, paiements...)
├── src/
│   ├── config/db.js         # Client Prisma partagé
│   ├── middleware/
│   │   ├── auth.middleware.js     # Vérification JWT
│   │   ├── rbac.middleware.js     # Contrôle d'accès par rôle
│   │   └── errorHandler.js        # Gestion centralisée des erreurs
│   ├── utils/
│   │   ├── jwt.js           # Signature/vérification des tokens
│   │   └── password.js      # Hachage bcrypt
│   ├── services/            # Logique métier (indépendante des routes HTTP)
│   │   ├── question.service.js      # Cycle de vie des questions
│   │   ├── quizSession.service.js   # Déroulement d'une session de test + scoring
│   │   ├── payout.service.js        # Calcul de la rémunération enseignants
│   │   └── payment.service.js       # Paiement Mobile Money + vérification webhook
│   ├── controllers/         # Reçoivent la requête HTTP, appellent les services
│   ├── routes/               # Déclaration des endpoints et des permissions par rôle
│   ├── app.js                # Configuration Express (sécurité, CORS, routes)
│   └── server.js             # Point d'entrée
├── package.json
└── .env.example
```

## Démarrage

```bash
cp .env.example .env      # renseigner DATABASE_URL et les secrets JWT
npm install
npx prisma migrate dev --name init
npm run dev
```

## Points clés d'implémentation

- **Rôles** : `admin`, `directeur`, `enseignant`, `eleve` — vérifiés à chaque route sensible via `allowRoles(...)`.
- **Questions** : une question créée par un enseignant est `en_attente` jusqu'à validation par le directeur de son propre domaine (`question.service.js`).
- **Sessions de test** : vérifient le quota avant de démarrer, ne renvoient jamais la bonne réponse au client avant la clôture, calculent le score et les conseils par thématique à la fin (`quizSession.service.js`).
- **Paiements** : toute activation d'abonnement passe par la confirmation signée du webhook de l'agrégateur (`payment.service.js`) — jamais par une simple redirection côté client.
- **Rémunération enseignants** : calculée par un job périodique (`payout.service.js`), jamais éditée manuellement, pour garder une traçabilité complète.

Ce backend est un socle fonctionnel prêt à être complété (tests automatisés, file de tâches asynchrones pour les paiements/paies, envoi de SMS/email, etc.).
