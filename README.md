# 🐕 Storm Tracker — Backend

API REST pour suivre les balades de chiens : chiens, humains, balades.
Node.js + **Express 5** (CommonJS) devant **Neon Postgres**. Déploiement Vercel.

---

## Démarrage

```bash
yarn install
cp .env.example .env      # renseigner au minimum DB_CONNECTION_STRING
yarn migrate              # applique migrations/*.sql (idempotent)
yarn dev                  # nodemon, http://localhost:3000
```

Prérequis : Node ≥ 18 (développé sous Node 24), Yarn, un Postgres accessible
(Neon, ou une instance locale).

Scripts :

| Script                | Rôle                                             |
| --------------------- | ------------------------------------------------ |
| `yarn dev`            | serveur en watch (`nodemon`)                     |
| `yarn start`          | serveur (`node app.js`)                          |
| `yarn migrate`        | applique les migrations en attente              |
| `yarn migrate:status` | liste migrations appliquées / en attente        |
| `yarn smoke`          | smoke test HTTP (voir `scripts/smoke.sh`)        |

---

## Structure

```
app.js                 config Express : CORS, helmet, logs, routes, 404, erreurs
db.js                  pool pg (URL de connexion ou champs séparés ; TLS Neon)
routes/
  dogs_sql.js          /dogs
  humans_sql.js        /humans
  walks_sql.js         /walks
  monitoring.js        /health, /status, /status/data
lib/
  validate.js          middleware express-validator -> { result, message }
  http-error.js        httpError(status, message) pour next(err)
  partial-update.js    UPDATE partiel paramétré + whitelist de colonnes
  rate-limit.js        limiteur pour signin / signup
  request-logger.js    journalisation des requêtes dans request_logs
migrations/            NNN_nom.sql, numéro croissant, idempotent
scripts/
  migrate.js           runner de migrations (table schema_migrations)
  introspect.sql       photo du schéma réel (à comparer aux migrations)
  smoke.sh             smoke test orienté sécurité + santé
  purge-request-logs.sql  purge du journal (> 30 jours)
```

Pas d'ODM, pas de MongoDB : uniquement `pg` avec des requêtes **paramétrées**.

---

## Variables d'environnement

Voir `.env.example`. Résumé :

| Variable                                    | Rôle                                                        |
| ------------------------------------------- | ---------------------------------------------------------- |
| `DB_CONNECTION_STRING`                      | URL Postgres (prendre l'URL **-pooler** de Neon)          |
| `DB_USER` / `DB_HOST` / `DB_NAME` / `DB_PASSWORD` / `DB_PORT` | utilisés seulement si `DB_CONNECTION_STRING` est absent |
| `DB_SSL`                                    | `disable` pour une base locale sans TLS ; sinon TLS        |
| `PORT`                                      | port d'écoute (défaut 3000)                                |
| `NODE_ENV`                                  | `production` active les logs morgan `combined`             |
| `CORS_ORIGINS`                              | liste blanche d'origines (CSV) ; vide = tout autorisé (dev) |
| `STATUS_TOKEN`                              | jeton pour `/status` et `/status/data` ; absent = 503     |
| `REQUEST_LOG`                               | `off` pour désactiver la journalisation des requêtes       |

---

## Forme des réponses

Convention actuelle (le front en dépend) :

- **Succès** : `{ "result": true, <payload>, "message"?: "…" }`
  où `<payload>` est une clé nommée (`allDogs`, `savedDog`, `connectedUser`…).
- **Erreur** : `{ "result": false, "message": "…" }` avec le bon code HTTP.
  Les messages destinés à l'utilisateur sont en français. Les détails du
  driver Postgres ne sont **jamais** renvoyés (message générique en 5xx,
  codes Postgres courants traduits en 4xx).

---

## Routes

### Chiens — `/dogs`

| Méthode | Route                    | Description                          |
| ------- | ------------------------ | ----------------------------------- |
| GET     | `/dogs`                  | tous les chiens                     |
| POST    | `/dogs`                  | créer un chien (`name`, `human` requis) |
| PATCH   | `/dogs/update/:dogId`    | mise à jour partielle (colonnes en whitelist) |
| DELETE  | `/dogs/:dogId`           | supprimer un chien                  |
| GET     | `/dogs/mydogs/:humanId`  | chiens d'un humain (404 si aucun)   |

Colonnes modifiables via PATCH : `name`, `human`, `birth_date`, `gender`,
`race1`, `race2`.

### Humains — `/humans`

| Méthode | Route                     | Description                            |
| ------- | ------------------------- | ------------------------------------- |
| GET     | `/humans`                 | tous les humains (sans `password`)    |
| POST    | `/humans/signup`          | inscription (`username`, `email`, `password`) |
| POST    | `/humans/signin`          | connexion ; `401` si identifiants faux |
| PATCH   | `/humans/logout/:humanId` | passe `online` à `false`              |
| PATCH   | `/humans/update/:humanId` | mise à jour partielle (`username`, `email`) |
| DELETE  | `/humans/:humanId`        | supprimer un humain (cascade chiens / balades) |

Mots de passe hachés `bcrypt` (12 tours). `signin`/`signup` sont
rate-limités (20 requêtes / 15 min / IP). Il n'y a **pas encore**
d'authentification par jeton sur les autres routes (chantier à venir).

### Balades — `/walks`

| Méthode | Route                   | Description                              |
| ------- | ----------------------- | -------------------------------------- |
| GET     | `/walks`                | toutes les balades (+ `dog_name`)      |
| POST    | `/walks`                | créer une balade (`date`, `walked_dog`, `walking_human` requis) |
| PATCH   | `/walks/update/:walkId` | mise à jour partielle (colonnes en whitelist) |
| DELETE  | `/walks/:walkId`        | supprimer une balade                   |
| GET     | `/walks/:humanId`       | balades d'un humain (404 si aucune)    |

Colonnes modifiables via PATCH : `date`, `time`, `duration`, `meetings`,
`pooped`, `peed`, `walked_dog`, `walking_human`, `notes`, `dog_mood`,
`human_mood`, `other`, `coprophagie`. `meetings` est du JSON (jsonb).

### Santé / observabilité

| Méthode | Route                      | Auth   | Description                             |
| ------- | -------------------------- | ------ | ------------------------------------- |
| GET     | `/health`                  | —      | état serveur + ping DB (200 / 503)   |
| GET     | `/status?token=…`          | jeton  | page HTML : santé, trafic 24 h, routes |
| GET     | `/status/data?token=…`     | jeton  | mêmes données en JSON                  |

Le jeton se passe en `?token=` ou dans l'en-tête `X-Status-Token`.

---

## Schéma de la base

Le schéma **fait foi dans `migrations/`** :

- `001_init.sql` — reproduction fidèle de la prod (baseline, no-op sur la base
  existante).
- `002_hardening.sql` — durcissement **optionnel** (`created_at`, `NOT NULL`
  sur `dogs.human` / `walks.date` / `walked_dog` / `walking_human`,
  `UNIQUE (dogs.human, name)`, index FK). À appliquer après nettoyage des
  données — voir le bloc de pré-vol en tête du fichier.
- `003_request_logs.sql` — journal des requêtes pour `/status`.

Pour photographier la base réelle et la comparer : `yarn introspect`
(ou `psql "$DB_CONNECTION_STRING" -f scripts/introspect.sql`).

Résumé (état `001`, tel qu'en prod) :

- **humans** : `id`, `username` varchar(30), `email` varchar(255) unique,
  `password` varchar(255), `online` bool
- **dogs** : `id`, `name` varchar(100), `birth_date`, `gender` (enum
  `gender_enum` : `MALE` / `FEMALE` / `INCONNU`), `race1` / `race2`
  varchar(20), `human` → `humans(id)` (nullable, FK sans cascade)
- **walks** : `id`, `date` (défaut `CURRENT_DATE`), `time` (défaut
  `CURRENT_TIME`), `duration`, `meetings` (jsonb), `pooped` / `peed` (bool),
  `walked_dog` → `dogs(id)`, `walking_human` → `humans(id)`, `notes`,
  `dog_mood` / `human_mood` / `other` (`text[]` NOT NULL `'{}'`),
  `coprophagie` smallint (`CHECK 0..4`)
- **request_logs** : `id`, `ts`, `method`, `path`, `route`, `status`,
  `duration_ms`, `ip`
- **schema_migrations** : suivi du runner

`002_hardening.sql` ajoute ensuite `created_at` partout et les `NOT NULL` /
`UNIQUE` ci-dessus.

---

## Déploiement (Vercel)

`vercel.json` construit `app.js` (`@vercel/node`) et réécrit toutes les
requêtes dessus. Vercel redéploie sur push de `master`.

À configurer côté Vercel (Environment Variables) : `DB_CONNECTION_STRING`
(URL -pooler), `CORS_ORIGINS`, `STATUS_TOKEN`, éventuellement `NODE_ENV`.
Après un changement de schéma : lancer `yarn migrate` depuis un poste ayant
l'URL de prod (voir la skill `db-migrate`).

---

## Contribuer

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) (méthode) et
[`conventions.md`](conventions.md) (code). Licence MIT.

Auteur : **Romain Authier** — [@dankysten](https://github.com/dankysten),
papa de Storm 🐕.
