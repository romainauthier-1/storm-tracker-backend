# storm-tracker-backend — CLAUDE.md

API **Express 5 (CommonJS)** devant **Neon Postgres** pour Storm Tracker
(suivi de balades de chien). Déploiement Vercel.

**À lire avant de coder :**

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — branches, PR, revue, « terminé ».
- [`conventions.md`](conventions.md) — structure, erreurs, SQL, migrations,
  nommage, sécurité.
- [`README.md`](README.md) — démarrage, table des routes, déploiement.

## Rappels rapides

- **CommonJS** (`require` / `module.exports`), pas d'ESM.
- Routes = câblage + logique simple ; helpers partagés dans `lib/`. SQL
  **toujours paramétré** ; le seul endroit qui interpole des identifiants est
  `lib/partial-update.js`, depuis une whitelist de colonnes codée en dur.
- `:id` d'URL → `param().isInt()` + `validate`, jamais concaténé dans une requête.
- Erreurs : `throw httpError(status, msg)` / `next(err)` → le gestionnaire
  central d'`app.js` répond `{ result: false, message }` (générique en 5xx).
  Pas de réponse d'erreur ad hoc dans une route.
- Réponses de succès : garder `{ result: true, <payloadNommé>, message? }`
  (contrat front). 404 sur ressource absente.
- Jamais de `password` (même haché) ni de détail Postgres dans une réponse.
- Changement de schéma → migration `migrations/NNN_nom.sql` idempotente dans le
  **même lot** ; `yarn migrate` + `yarn migrate:status`.
- Avant PR : `yarn migrate` (si schéma) + `yarn smoke` verts, happy-path curl.
- Variables d'env : `.env.example`. Critiques en prod : `DB_CONNECTION_STRING`
  (URL `-pooler`), `CORS_ORIGINS`, `STATUS_TOKEN`.
- **Pas encore** d'auth par jeton sur les routes métier — chantier connu.

## Outillage Claude (`.claude/`)

- `agents/reviewer.md` — relit un diff selon `conventions.md`.
- `skills/db-migrate` — ajouter / appliquer une migration de schéma.
- `skills/deploy` (+ `smoke.sh`) — mise en prod Vercel + smoke test.
