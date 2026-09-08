---
name: deploy
description: Déployer une modif du backend Storm Tracker sur Vercel et vérifier la prod. À utiliser quand un lot est mergé et prêt à partir.
---

# deploy — mise en prod (backend)

Vercel redéploie automatiquement sur push de la branche par défaut (`master`).
`vercel.json` construit `app.js` (`@vercel/node`) et y réécrit toutes les
requêtes.

## Étapes

1. **Ne jamais merger sans l'accord explicite de Romain.**
2. Après merge sur `master`, vérifier que le déploiement est parti (dashboard
   Vercel, ou attendre ~1 min).
3. **Si des variables d'env ont changé** : les mettre à jour côté Vercel
   (Environment Variables) — le backend relit l'env au redeploy.
   Critiques : `DB_CONNECTION_STRING` (URL **-pooler** Neon), `CORS_ORIGINS`,
   `STATUS_TOKEN`.
4. **Si le schéma a changé** : appliquer la migration en prod (skill
   `db-migrate`, étape 4) — ce n'est pas fait par le déploiement.
5. **Smoke test prod** :
   ```bash
   PROD_URL=https://<projet>.vercel.app STATUS_TOKEN=<jeton> \
     bash .claude/skills/deploy/smoke.sh
   ```
   Vérifie `/`, `/health`, une route inconnue → 404, l'injection SQL
   neutralisée, `/status` protégé, l'en-tête CORS.

## Pièges

- `trust proxy = 1` est requis derrière Vercel (déjà dans `app.js`) pour que
  `req.ip` (rate-limit) soit correct.
- Renseigner `PROD_URL` dans `.claude/skills/deploy/smoke.sh` une fois l'URL
  Vercel connue, pour ne plus avoir à la passer en env.
- Base : URL **-pooler** de Neon, sinon les connexions serverless saturent.
