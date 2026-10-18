# Remparts Néon

*Trance, tuques et formulaires.* Un jeu de survie par vagues à la première personne, dans un Québec néon et satirique, qui tourne dans le navigateur.

Les cônes orange ont pris vie, les bureaucrates zombies remplissent des formulaires, les consultants lancent des factures et les déneigeuses-bots chargent à minuit. Choisis ton arme, tiens les remparts et écoute Ti-Guy Néon sur CNÉO 88,8 FM.

- **3 armes** : Le Bâton (hockey, mêlée), La Pelle-fusil (tir à répétition), L'Onde (énergie, explosions en zone).
- **La musique mène la danse** : trance générée en direct ; le build-up monte, le drop lâche la horde, le breakdown te laisse souffler.
- **Sur le beat** : attaque quand les barres se rejoignent au centre du viseur pour faire plus de dégâts (aucune pénalité sinon).
- **3 quartiers** : Vieux-Québec néon, Saint-Roch néon, Le Pont de glace, chacun avec 3 vagues et un boss.
- **Dépanneur Néon** : dépense tes piasses néon entre les vagues.
- Clavier/souris, manette et écran tactile.

Tous les personnages sont fictifs.

## Lancer
Servir le dossier avec n'importe quel serveur statique (les modules ES ne marchent pas en `file://`) :
```
node tools/serve.js 8765   # puis http://localhost:8765/
```
Paramètres d'URL : `?q=low` ou `?q=high` (qualité), `?touch` (forcer les contrôles tactiles).

## Tests
`node tools/bot.js [baton|pelle|onde]` : bot Playwright (Chromium sans écran + SwiftShader) qui joue une partie complète, achète des améliorations et vérifie qu'il n'y a aucune erreur JS. Captures dans `shots/`. `node tools/touch.js` vérifie la disposition tactile.

## Crédits
- [Three.js](https://threejs.org) r170 (licence MIT, `vendor/THREE-LICENSE`), copié dans `vendor/`.
- Polices Jersey 10 et Press Start 2P (SIL Open Font License, `assets/fonts/`).
- Code, musique, textes et graphismes : originaux, générés par le code.
