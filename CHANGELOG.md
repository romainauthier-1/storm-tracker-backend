# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Une entrée par lot mergé, sous la version en préparation.

## [Non publié]

### Sécurité

- Fin de l'injection SQL dans les routes `PATCH /{dogs,humans,walks}/update/:id`
  (id lié + whitelist de colonnes par table via `lib/partial-update.js`).
- `POST /humans/signin` : la vérification du mot de passe était inopérante
  (comparaison sur une promesse) — n'importe quel mot de passe passait.
  Corrigé (`await bcrypt.compare`), réponse `401` générique.
- `bcrypt` : hachage en 12 tours (au lieu de 10, en mode synchrone).
- Plus aucun hash de mot de passe dans les réponses (`DELETE /humans/:id`
  notamment).
- Gestionnaire d'erreurs central : plus de message Postgres renvoyé au client ;
  codes `23505` / `23503` / `23502` / `23514` / `22P02` traduits en 4xx.
- `helmet`, limite de corps JSON (100 kb), `trust proxy = 1`, CORS restreint
  via `CORS_ORIGINS`, rate-limit sur `signin` / `signup`.
- `db.js` : TLS désactivable en local (`DB_SSL=disable`).

### Ajouté

- `migrations/001_init.sql` : reproduction fidèle du schéma de prod
  (humans / dogs / walks) — baseline, no-op sur la prod existante.
- `migrations/002_hardening.sql` : durcissement **optionnel** (created_at,
  `NOT NULL` sur `dogs.human` / `walks.date` / `walked_dog` / `walking_human`,
  `UNIQUE (dogs.human, name)`, index FK, CASCADE en option commentée). À
  appliquer après nettoyage des données (bloc de pré-vol dans le fichier).
- `scripts/migrate.js` (+ `yarn migrate` / `migrate:status`), `schema_migrations`.
- `scripts/introspect.sql` / `scripts/introspect.js` (+ `yarn introspect`) —
  photo du schéma réel à comparer aux migrations.
- `scripts/smoke.sh` (+ `yarn smoke`) — smoke test sécurité + santé.
- `migrations/003_request_logs.sql` + `lib/request-logger.js` — journal des
  requêtes HTTP.
- `GET /health` (sonde publique) ; `GET /status` + `GET /status/data` (page de
  santé et trafic, protégées par `STATUS_TOKEN`).
- `scripts/purge-request-logs.sql` — purge du journal (> 30 jours).
- `.env.example`.

### Modifié

- Bugs corrigés : `checkDog.rowsCount` → `rowCount` (garde anti-doublon morte),
  `rowcount` + `return` manquant dans `logout`, `SELECT *` mort dans
  `GET /walks`.
- `POST /walks` : `dog_mood` / `human_mood` / `other` repliés sur `[]`
  (colonnes `text[] NOT NULL`). `POST /dogs` : `gender` validé contre l'enum
  `gender_enum` (400 propre au lieu d'un 500 driver).
- Documentation (`README.md`, `conventions.md`, `CONTRIBUTING.md`, `CLAUDE.md`,
  `.claude/`) réécrite pour ce repo (elle décrivait un autre projet).

### Retiré

- Dépendance `mongoose` (jamais utilisée).
