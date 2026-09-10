---
name: db-migrate
description: Ajouter et appliquer une migration de schéma sur la base Neon de Storm Tracker. À utiliser dès qu'une table ou une colonne doit changer.
---

# db-migrate — évolution du schéma

Le schéma vit **uniquement** dans `migrations/*.sql`, joué par
`scripts/migrate.js` (table de suivi `schema_migrations`). Aucune DDL ailleurs.
Voir aussi `conventions.md` § « Base de données & migrations ».

## Procédure

1. Créer `migrations/NNN_nom.sql` (NNN = numéro suivant, sur 3 chiffres).
   Contenu **idempotent** :
   - `CREATE TABLE IF NOT EXISTS …`
   - `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`
   - contraintes sur tables existantes : bloc
     `DO $$ BEGIN … EXCEPTION WHEN … THEN … END $$;` pour ne pas casser si des
     données violent la contrainte (échouer en `NOTICE`).
   - jamais de `DROP` sans sauvegarde préalable et accord de Romain.
2. **Tester en local** : Postgres jetable, `DB_CONNECTION_STRING` dessus avec
   `?sslmode=disable` (ou `DB_SSL=disable`), puis :
   ```bash
   yarn migrate:status   # [ ] la nouvelle migration
   yarn migrate          # applied NNN_nom.sql
   yarn migrate          # "Aucune migration en attente" (idempotence)
   ```
   Vérifier la forme obtenue (`psql … -c "\d table"`).
3. **Comparer à la prod avant d'appliquer** :
   ```bash
   psql "$DB_CONNECTION_STRING" -f scripts/introspect.sql
   ```
   Nettoyer les données qui violeraient les nouvelles contraintes.
4. **Appliquer en prod** : depuis un poste avec l'URL de prod en env
   (le `.env` local qui contient `DB_CONNECTION_STRING`) :
   ```bash
   yarn migrate:status && yarn migrate
   ```
   `migrate` ne rejoue jamais une migration déjà enregistrée.
5. Ajouter une entrée au `CHANGELOG.md` et commiter la migration **avec** le
   code qui l'utilise, dans le même lot / la même PR.

## Rappels

- L'URL de prod : `DB_CONNECTION_STRING` dans `.env` (non versionné), URL
  **-pooler** de Neon.
- Migration = code : une PR, testée, jamais mergée sans accord de Romain.
