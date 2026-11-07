# Weapon Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Rendre les trois armes originales expressives sans modifier le combat.

**Architecture:** Un module pur de présentation fournit enveloppes, poses et priorité de marqueurs. Le combat existant émet ces événements sans retarder les dégâts ; audio et animation consomment ces événements.

**Tech Stack:** JavaScript ES modules, Three.js existant, Web Audio, node:test sans dépendance.

## Global Constraints
Aucun Nerf. Aucun push, PR, merge ou déploiement. Préserver dégâts, cadence, portée, précision, projectiles, améliorations, beat, sauvegardes, musique, cartes et contrôleurs. Aucun nouveau hitstop. FX mutualisés et shake=0 inchangé. Validation navigateur par coordinateur seulement.

## Risques et confinement
Risque moyen/impact élevé : appel combat modifié accidentellement ; comparaison déterministe avec 8ce6e16. Risque moyen/impact moyen : saturation audio et animation ; caps, enveloppes testées, revue navigateur requise. Risque faible/impact moyen : état résiduel après menu/respawn ; reset dans buildViewmodel/newPlayer. Branche arcade/weapon-feel-originals ; main et distant intacts. Aucun acte irréversible.

### Task 1 — Contrats de présentation et régression
Files: tests/weapon-feel.test.mjs, tests/combat-invariants.test.mjs.
- [x] Écrire des tests node:test utilisant assert : poses six gestes distincts, continuité, retour au repos, retrigger borné, pause, reset ; kill prioritaire ; gate audio borné et réutilisable.
- [x] Exécuter `node --test tests/*.test.mjs` : constater rouge avant module.
- [x] Tester les fonctions réelles computeStats, attack, rayHits et dégâts avec entrées déterministes contre `git show 8ce6e16:js/main.js` ; comparer événements dégâts/projectiles et états numériques, base et amélioré, primary/alt, beat/miss/hit.

### Task 2 — Présentation pure et branchement
Files: js/weapon-feel.js (nouveau), js/main.js.
Interfaces: createFeel() -> état borné ; triggerFeel(state,path,alt,on) ; stepFeel(state,dt) ; sampleFeel(state) -> {x,y,z,rx,ry,rz,energy,trail}; markerKind(current,remaining,next) ; allowImpact(state,id,now) -> boolean ; flinchPose(age,strength,side) -> {x,z}.
- [x] Implémenter enveloppes courte impulsion puis récupération amortie, deux canaux primary/alt, sans queue ni timer de combat.
- [x] Brancher trigger après validation attaque, step en jeu seulement, sample au viewmodel ; reset à reconstruction/respawn.
- [x] Remplacer uniquement rotation/recul cosmétique ; garder trajets caméra et shake existants.
- [x] Poser priorité kill > beat > normal pendant durée active ; conserver durées existantes.
- [x] `node --test tests/*.test.mjs` doit passer ; inspection diff sans modification des équations de combat.

### Task 3 — Choc, audio et réaction ennemi
Files: js/audio.js, js/main.js, js/weapon-feel.js.
- [x] Tests rouges de coalescence par identifiant d’attaque et limite temporelle ; test flinch décroissant sans coordonnées combat.
- [x] Ajouter couches courtes propres aux armes dans shoot/hit, gate bornée avec identifiant projectile propagé jusqu’aux impacts ; aucun callback retardant les dégâts.
- [x] Appliquer flinch directionnel additif après animate, corps seulement, force atténuée sur boss/plow. Pas de changement physique/IA ni hitstop.
- [x] Réutiliser traînée, flash et budgets existants ; pas de nouveaux pools FX.
- [x] Tests verts, vérification syntaxe des modules JS par `node --check`.

### Task 4 — Documentation et revue locale
Files: README.md, GAME.md (nouveau), présent plan.
- [x] Documenter ressenti, invariants, commande `node --test tests/*.test.mjs` et limites des tests.
- [x] Fournir checklist navigateur six gestes, hit/miss/kill, beat, améliorations, radio, volumes, pause/reset, tactile low et shake zéro.
- [ ] Relire diff, relancer tests/syntaxe et créer commit local normal seulement. Relecture et vérifications faites ; commit refusé : Author identity unknown. Aucune identité/authentification modifiée.
- [x] Démarrer serveur statique local si utile, transmettre URL et état à coordinateur ; aucune prétention de validation visuelle/audio.

## Revue du plan
Tous les éléments du design approuvé sont couverts ; paramètres de combat conservés dans leurs fonctions existantes. Aucun nouveau système de progression ou architecture générale. Exécution inline déjà demandée, pas de cloud.


## Résultat d’exécution locale
117 tests Node passent, dont 96 comparaisons base/améliorations × hit/miss × beat × survie/mort pour les six attaques. Rouge observé avant implémentation des gestes/marqueurs/gate/flinch, puis des branchements, puis du reset et de la protection du RNG. Syntaxe de tous les modules JS et tests contrôlée ; git diff --check propre. Les fichiers de carte, FX, texte, contrôleurs et ennemis restent inchangés (la pose additive est appliquée dans main après animate).

Paramètres de présentation retenus (aucun n’est utilisé par le combat) : durées primaire/spécial Bâton 0,32/0,44 s, Pelle 0,17/0,38 s, Onde 0,28/0,48 s ; attaque rapide sur 12 % de l’enveloppe, retour quadratique. Deux canaux fixes, pas de file. Gate audio 45 ms et 16 identifiants ; flinch visuel 0,2 s max. Aucun ajout de particules ni de shake.

Branche conservée pour revue, aucun distant modifié. Serveur de revue : http://localhost:8873 (PID transmis au coordinateur). Revue indépendante du code et validation visuelle/audio restent nécessaires avant publication ; la checklist GAME.md n’est pas cochée artificiellement.

Commit local tenté après tests verts, refusé par Git faute de user.name/user.email. Aucun commit créé ; HEAD reste la référence 8ce6e16. Fichiers préparés sur la branche pour revue, sans distant modifié.


## Suivi revue indépendante — continuité des retriggers
Problème confirmé et reproduit : retour à zéro lors d’un retir avant fin du recul ; 8 nouveaux cas rouges, dont Pelle à 1/(7,5 × 1,75) s. Correction locale : mémoriser le déplacement courant par canal, puis rejoindre le pic du nouveau geste et récupérer, sans nouvelle file ni changement du combat. Gain beat propre à chaque canal pour préserver la pose du geste simultané. 13 nouveaux tests : six gestes à 0,1 s, six aux cadences maximales améliorées, un chevauchement primary/secondary ; vérification avant/après événement à 1e-12, pas de saut >0,09 dans la première milliseconde, 100 retriggers par scénario, retour au repos. 130 tests verts au total. Politique de marqueurs faibles sans rafraîchissement et gate audio globale 45 ms documentées comme intentionnelles.

Le serveur est désormais géré par le coordinateur (PID 212164) sur localhost:8873 ; aucun nouveau serveur ni arrêt pendant cette révision. Rechargement du navigateur nécessaire pour charger le correctif. Autorisation reçue d’utiliser uniquement les flags de commande de commit pour l’auteur historique vérifié, sans modification de configuration globale ou d’authentification.
