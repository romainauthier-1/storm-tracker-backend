-- 003_request_logs — journal des requêtes HTTP pour la page /status.
--
-- Une ligne par requête terminée. Alimenté par lib/request-logger.js en
-- fire-and-forget (une erreur d'insert n'impacte jamais la réponse).
-- Idempotent.

CREATE TABLE IF NOT EXISTS request_logs (
	id          bigserial PRIMARY KEY,
	ts          timestamptz NOT NULL DEFAULT now(),
	method      text NOT NULL,
	path        text NOT NULL,
	route       text NOT NULL,
	status      integer NOT NULL,
	duration_ms integer NOT NULL,
	ip          text
);

-- Agrégats du dashboard : fenêtre temporelle + regroupement par route.
CREATE INDEX IF NOT EXISTS request_logs_ts_idx    ON request_logs (ts DESC);
CREATE INDEX IF NOT EXISTS request_logs_route_idx ON request_logs (route, ts DESC);
