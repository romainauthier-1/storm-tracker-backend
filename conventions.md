# Conventions — storm-tracker-backend

Conventions d'écriture du code de l'API. Le « comment on travaille ensemble »
est dans [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Stack

Node ≥ 18 · **Express 5 en CommonJS** (`require` / `module.exports`) · Neon
Postgres via `pg` · `express-validator` · `express-rate-limit` · `helmet` ·
`morgan` · `bcrypt`. Gestionnaire de paquets : **Yarn**.

Pas d'ODM, pas de MongoDB. Pas (encore) d'ESLint / Prettier / suite de tests
unitaires : la vérification passe par `yarn smoke` + revue manuelle.

## Arborescence

```
app.js            config Express (CORS, helmet, morgan, request-logger, routes,
                  404, gestionnaire d'erreurs central) + app.listen
db.js             pool pg unique, exporté
routes/           un fichier par domaine : dogs_sql.js, humans_sql.js,
                  walks_sql.js, monitoring.js
lib/              helpers partagés (validate, http-error, partial-update,
                  rate-limit, request-logger)
migrations/       NNN_nom.sql idempotent, numéro croissant
scripts/          migrate.js (runner), introspect.sql, smoke.sh, purge-*.sql
```

Une API JSON n'a pas de dossier `public/`. La page `/status` est une exception
assumée : HTML servi en dur par `routes/monitoring.js`.

## Règles de code

- **CommonJS partout** : `require` / `module.exports`. Pas de `import` / `export`.
- **Routes = câblage + logique simple.** Chaque fichier `routes/*.js` monte ses
  middlewares (`validate`, `authLimiter`…) et fait ses requêtes. Les helpers
  réutilisables vont dans `lib/`. Pas de couche `controllers/` séparée pour
  l'instant (projet volontairement petit).
- **SQL toujours paramétré** : `Pool.query(text, values)`. Aucune interpolation
  de valeur. Le seul endroit qui interpole des identifiants est
  `lib/partial-update.js`, et uniquement depuis une **whitelist de colonnes
  codée en dur** par table — jamais une clé issue de `req.body` telle quelle.
- **`:id` de route** : valider en entier (`param("x").isInt({ min: 1 })`) +
  `validate`. Ne jamais mettre un paramètre d'URL dans une requête autrement
  que lié (`$1`).
- **Erreurs** : `throw httpError(status, message)` (ou `next(err)`) — Express 5
  forwarde les rejets de promesse, pas besoin de `try/catch { next(err) }` qui
  ne fait que relayer. Le gestionnaire central d'`app.js` est **le seul** à
  écrire une réponse d'erreur : `{ result: false, message }`, message
  générique en 5xx, codes Postgres courants (`23505`, `23503`, `23502`,
  `23514`, `22P02`) traduits en 4xx. Pas de
  `res.status(500).json({ message: err.message })` dans une route.
- **Validation** : `express-validator` (tableau de règles) + `lib/validate.js`
  sur toute route qui lit `req.body` / `req.params`.
- **Réponses de succès** : garder la forme `{ result: true, <payloadNommé>,
  message? }` (contrat consommé par le front). Une ressource absente → **404**
  `{ result: false, message }`, pas `null` + 200.
- **Secrets & données perso** : jamais de `password` (même haché) dans une
  réponse — passer par `stripPassword`. Ne pas logger de donnée personnelle
  sans raison. `.env` gitignoré ; `.env.example` liste les clés sans valeur.

## Nommage & style

- Fichiers de routes : `xxx_sql.js` (existant) ; helpers : `xxx.js` dans `lib/`.
- Identifiants **en anglais**, explicites (`paramIndex`, pas `n`). Pas
  d'abréviation d'une lettre.
- **Langue** : messages destinés à l'utilisateur en **français** ; code,
  commentaires et logs en **anglais**.
- Indentation **tabulation** (comme le code existant).

## Base de données & migrations

- Le schéma vit **uniquement** dans `migrations/NNN_nom.sql` : numéro croissant
  sur 3 chiffres, idempotent (`CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, blocs `DO … EXCEPTION` pour les contraintes sur
  données existantes). Jamais de DDL ailleurs. Jamais de `DROP` sans sauvegarde
  et accord de Romain.
- Appliquer : `yarn migrate`. État : `yarn migrate:status`. Le runner
  (`scripts/migrate.js`) enregistre chaque fichier dans `schema_migrations` et
  ne le rejoue pas.
- La migration est commitée **avec** le code qui l'utilise (même lot / PR).
- Avant d'appliquer en prod : `scripts/introspect.sql` et comparaison avec la
  migration. Voir la skill `db-migrate`.

## Sécurité — rappels

- Toutes les routes métier sont **publiques** aujourd'hui (pas d'auth par
  jeton). Tant que c'est le cas, ne pas ajouter de route qui exposerait plus
  de données personnelles sans en parler à Romain.
- `helmet`, limite de corps JSON à 100 kb, `trust proxy = 1` (Vercel),
  rate-limit sur les routes de credentials.
- `/status` et `/status/data` exigent `STATUS_TOKEN` (comparaison en temps
  constant).
