-- Rétention du journal des requêtes : supprime les lignes de plus de 30 jours.
-- À lancer à la main de temps en temps, ou via un cron (Vercel Cron, GitHub
-- Actions planifié…).
--
--   psql "$DB_CONNECTION_STRING" -f scripts/purge-request-logs.sql

DELETE FROM request_logs WHERE ts < now() - interval '30 days';
