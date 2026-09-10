# Contribuer à storm-tracker-backend

API de Storm Tracker. Ce document décrit **comment on travaille ensemble**
(Romain + Claude). Les conventions de code sont dans
[`conventions.md`](conventions.md).

## Rôles

|                            | Romain                     | Claude (Claude Code)                               |
| -------------------------- | -------------------------- | ------------------------------------------------- |
| Décisions produit / métier | **décide**                 | propose un schéma ou un plan, jamais de choix seul |
| Implémentation             | relit, peut coder          | code sur une branche dédiée                       |
| Ouverture de PR            | —                          | **ouvre** la PR, applique la revue                |
| Merge                      | **merge** (jamais délégué) | ne merge jamais                                   |
| Déploiement                | déclenche / valide         | prépare, documente                               |

Claude s'identifie : chaque commit porte les trailers `Co-Authored-By: Claude …`
et `Claude-Session: …` ; le corps de PR se termine par
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Cycle de contribution

**1 lot cohérent = 1 branche = 1 PR.** Un lot se relit et se valide d'un bloc.
Si la description de la PR a besoin d'un « et aussi », c'est deux lots.

1. Partir de `master` à jour (`git checkout master && git pull --ff-only`).
2. Brancher : `type/kebab-sujet`, `type` ∈
   `feat` · `fix` · `chore` · `refactor` · `docs` · `migration`.
3. Commits en [Conventional Commits](https://www.conventionalcommits.org) avec
   scope : `fix(security): …`, `feat(db): …`. Corps = quoi / pourquoi + liste
   des changements + ligne de vérification (« yarn smoke : 15/15 »). Commiter
   **dès qu'un problème est résolu**, pas en fin de session.
4. Ouvrir la PR quand le lot est complet et la [définition de « terminé »](#définition-de--terminé-)
   remplie.
5. Romain relit et merge. **Jamais de merge sans son accord explicite.**

Les PR peuvent être **empilées** (une branche part de la précédente non encore
mergée) quand un lot dépend du précédent — le préciser dans la description.

## Définition de « terminé »

- [ ] `yarn migrate` passe en local si le schéma change, et une migration
      `migrations/NNN_nom.sql` idempotente est **dans le même lot**
- [ ] `yarn smoke` vert contre un serveur local branché sur une base migrée
- [ ] happy-path des routes touchées vérifié à la main (curl) et noté dans le
      commit
- [ ] `node --check` sur les fichiers modifiés (pas de lint automatisé pour
      l'instant)
- [ ] aucun secret en clair ; `.env` gitignoré ; pas de `password` ni de détail
      Postgres dans les réponses
- [ ] passe de l'agent `reviewer` sans « bloquant »

## Cadence de session

- **Début** : rappeler l'objectif et le lot en cours.
- **Fin** : `git status` propre ; `master` local aligné sur `origin` ; brancher
  les PR encore ouvertes et la prochaine étape.

## Mise en place locale

```bash
yarn install
cp .env.example .env      # renseigner DB_CONNECTION_STRING au minimum
yarn migrate
yarn dev                  # http://localhost:3000
```

Tester sans toucher la prod : lancer un Postgres jetable (`initdb` + `pg_ctl`,
ou un conteneur), pointer `DB_CONNECTION_STRING` dessus avec `?sslmode=disable`
(ou `DB_SSL=disable`), `yarn migrate`, puis `yarn dev` et
`STATUS_TOKEN=xxx BASE_URL=http://localhost:3000 yarn smoke`.
