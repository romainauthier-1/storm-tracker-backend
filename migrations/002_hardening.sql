-- 002_hardening — durcissement du schéma (OPTIONNEL).
--
-- Contrairement à 001, cette migration RESSERRE le schéma : colonnes NOT NULL,
-- created_at, unicité (human, name). Elle est idempotente et chaque bloc échoue
-- proprement en NOTICE si des données existantes le violent — mais dans ce cas
-- la contrainte n'est PAS posée. Nettoyer les données d'abord.
--
-- ┌─ PRÉ-VOL — à lancer AVANT `yarn migrate`, corriger ce qui remonte ─────────┐
-- │ SELECT id FROM dogs  WHERE human IS NULL;                                  │
-- │ SELECT id FROM walks WHERE date IS NULL                                    │
-- │                         OR walked_dog IS NULL OR walking_human IS NULL;    │
-- │ SELECT human, name, count(*) FROM dogs                                     │
-- │   GROUP BY human, name HAVING count(*) > 1;                                │
-- └──────────────────────────────────────────────────────────────────────────┘

-- --- created_at sur les 3 tables (rétro-daté à now() pour les lignes existantes)
ALTER TABLE humans ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE dogs   ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE walks  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- --- colonnes obligatoires
DO $$ BEGIN
	ALTER TABLE dogs ALTER COLUMN human SET NOT NULL;
EXCEPTION WHEN others THEN RAISE NOTICE 'dogs.human SET NOT NULL ignoré : %', SQLERRM;
END $$;

DO $$ BEGIN
	ALTER TABLE walks ALTER COLUMN date SET NOT NULL;
EXCEPTION WHEN others THEN RAISE NOTICE 'walks.date SET NOT NULL ignoré : %', SQLERRM;
END $$;

DO $$ BEGIN
	ALTER TABLE walks ALTER COLUMN walked_dog SET NOT NULL;
EXCEPTION WHEN others THEN RAISE NOTICE 'walks.walked_dog SET NOT NULL ignoré : %', SQLERRM;
END $$;

DO $$ BEGIN
	ALTER TABLE walks ALTER COLUMN walking_human SET NOT NULL;
EXCEPTION WHEN others THEN RAISE NOTICE 'walks.walking_human SET NOT NULL ignoré : %', SQLERRM;
END $$;

-- --- un chien porte un nom unique chez un même humain
-- On teste l'existence plutôt que d'attraper l'exception : une contrainte UNIQUE
-- crée un index homonyme, donc la reposer lève `duplicate_table`
-- (« relation … already exists »), pas `duplicate_object`.
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'dogs_human_name_key' AND conrelid = 'dogs'::regclass
	) THEN
		ALTER TABLE dogs ADD CONSTRAINT dogs_human_name_key UNIQUE (human, name);
	END IF;
EXCEPTION
	WHEN unique_violation THEN
		RAISE NOTICE 'dogs (human, name) : doublons existants, UNIQUE non posée';
END $$;

CREATE INDEX IF NOT EXISTS dogs_human_idx          ON dogs (human);
CREATE INDEX IF NOT EXISTS walks_walked_dog_idx    ON walks (walked_dog);
CREATE INDEX IF NOT EXISTS walks_walking_human_idx ON walks (walking_human);

-- --- OPTIONNEL : passer les FK en ON DELETE CASCADE (supprimer un humain
-- --- supprime ses chiens et balades). Décommenter si c'est le comportement
-- --- voulu ; sinon une suppression d'humain référencé échouera (comportement
-- --- actuel : RESTRICT).
-- DO $$ BEGIN
-- 	ALTER TABLE dogs DROP CONSTRAINT IF EXISTS fk_dogs_human;
-- 	ALTER TABLE dogs ADD  CONSTRAINT fk_dogs_human
-- 		FOREIGN KEY (human) REFERENCES humans(id) ON DELETE CASCADE;
-- 	ALTER TABLE walks DROP CONSTRAINT IF EXISTS fk_walked_dog;
-- 	ALTER TABLE walks ADD  CONSTRAINT fk_walked_dog
-- 		FOREIGN KEY (walked_dog) REFERENCES dogs(id) ON DELETE CASCADE;
-- 	ALTER TABLE walks DROP CONSTRAINT IF EXISTS fk_walking_human;
-- 	ALTER TABLE walks ADD  CONSTRAINT fk_walking_human
-- 		FOREIGN KEY (walking_human) REFERENCES humans(id) ON DELETE CASCADE;
-- END $$;
