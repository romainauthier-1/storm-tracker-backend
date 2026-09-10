-- Photographie du schéma réel de la base. À lancer sur Neon (psql, ou l'éditeur
-- SQL du dashboard) puis à comparer avec migrations/001_init.sql.
--
--   psql "$DB_CONNECTION_STRING" -f scripts/introspect.sql

\echo '=== Colonnes ==='
SELECT table_name,
       ordinal_position AS pos,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('humans', 'dogs', 'walks')
ORDER BY table_name, ordinal_position;

\echo '=== Contraintes (PK / FK / UNIQUE / CHECK) ==='
SELECT tc.table_name,
       tc.constraint_type,
       tc.constraint_name,
       kcu.column_name,
       ccu.table_name  AS references_table,
       ccu.column_name AS references_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('humans', 'dogs', 'walks')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

\echo '=== Index ==='
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('humans', 'dogs', 'walks')
ORDER BY tablename, indexname;

\echo '=== Volumétrie ==='
SELECT 'humans' AS table, count(*) FROM humans
UNION ALL SELECT 'dogs', count(*) FROM dogs
UNION ALL SELECT 'walks', count(*) FROM walks;
