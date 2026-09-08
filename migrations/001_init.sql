-- 001_init — schéma de référence de Storm Tracker.
--
-- Reproduction FIDÈLE du schéma de prod au moment où le versionnage a démarré
-- (obtenu par introspection : `yarn introspect`). But :
--   * sur la prod : tout est `IF NOT EXISTS` / bloc `DO` gardé => no-op total ;
--   * sur une base neuve (dev / test) : recrée la même forme que la prod.
--
-- Aucun durcissement ici (NOT NULL supplémentaires, created_at, CASCADE,
-- UNIQUE (human, name)…). Voir 002_hardening.sql, optionnel et à appliquer
-- après nettoyage des données.

-- ---------------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------------
-- gender_enum est utilisé par dogs.gender. reaction_id / relationship_id
-- existent en prod mais ne sont rattachés à aucune colonne de dogs/humans/walks
-- — conservés pour fidélité de la baseline.
DO $$ BEGIN
	CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'INCONNU');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE reaction_id AS ENUM ('good', 'neutral', 'play', 'fear', 'fight');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE relationship_id AS ENUM ('friend', 'foe');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- humans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS humans (
	id       serial PRIMARY KEY,
	username varchar(30)  NOT NULL,
	email    varchar(255) NOT NULL,
	password varchar(255) NOT NULL,
	online   boolean DEFAULT false
);

DO $$ BEGIN
	ALTER TABLE humans ADD CONSTRAINT humans_email_key UNIQUE (email);
EXCEPTION
	WHEN duplicate_object THEN NULL;
	WHEN duplicate_table THEN NULL;
	WHEN unique_violation THEN
		RAISE NOTICE 'humans.email : doublons existants, UNIQUE non posée';
END $$;

-- ---------------------------------------------------------------------------
-- dogs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dogs (
	id         serial PRIMARY KEY,
	name       varchar(100) NOT NULL,
	birth_date date,
	gender     gender_enum,
	race1      varchar(20),
	race2      varchar(20),
	human      integer
);

DO $$ BEGIN
	ALTER TABLE dogs ADD CONSTRAINT fk_dogs_human
		FOREIGN KEY (human) REFERENCES humans(id);
EXCEPTION
	WHEN duplicate_object THEN NULL;
	WHEN others THEN RAISE NOTICE 'dogs.human FK ignorée : %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- walks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS walks (
	id            serial PRIMARY KEY,
	date          date DEFAULT CURRENT_DATE,
	time          time DEFAULT CURRENT_TIME,
	duration      integer,
	meetings      jsonb,
	pooped        boolean,
	peed          boolean,
	walked_dog    integer,
	walking_human integer,
	notes         text,
	dog_mood      text[] NOT NULL DEFAULT '{}',
	human_mood    text[] NOT NULL DEFAULT '{}',
	other         text[] NOT NULL DEFAULT '{}',
	coprophagie   smallint
);

DO $$ BEGIN
	ALTER TABLE walks ADD CONSTRAINT fk_walked_dog
		FOREIGN KEY (walked_dog) REFERENCES dogs(id);
EXCEPTION
	WHEN duplicate_object THEN NULL;
	WHEN others THEN RAISE NOTICE 'walks.walked_dog FK ignorée : %', SQLERRM;
END $$;

DO $$ BEGIN
	ALTER TABLE walks ADD CONSTRAINT fk_walking_human
		FOREIGN KEY (walking_human) REFERENCES humans(id);
EXCEPTION
	WHEN duplicate_object THEN NULL;
	WHEN others THEN RAISE NOTICE 'walks.walking_human FK ignorée : %', SQLERRM;
END $$;

DO $$ BEGIN
	ALTER TABLE walks ADD CONSTRAINT walks_coprophagie_check
		CHECK (coprophagie >= 0 AND coprophagie <= 4);
EXCEPTION
	WHEN duplicate_object THEN NULL;
	WHEN check_violation THEN
		RAISE NOTICE 'walks.coprophagie : valeurs hors [0,4], CHECK non posée';
END $$;
