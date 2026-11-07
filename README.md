# Remparts Néon

*Trance, tuques et formulaires.* Un jeu de survie par vagues à la première personne, dans un Québec néon et satirique, qui tourne dans le navigateur.

Les cônes orange ont pris vie, les bureaucrates zombies remplissent des formulaires, les consultants lancent des factures et les déneigeuses-bots chargent à minuit. Choisis ton arme, tiens les remparts et écoute Ti-Guy Néon sur CNÉO 88,8 FM.

- **3 armes** : Le Bâton (hockey, mêlée), La Pelle-fusil (tir à répétition), L'Onde (énergie, explosions en zone).
- **La musique mène la danse** : trance générée en direct ; le build-up monte, le drop lâche la horde, le breakdown te laisse souffler.
- **Sur le beat** : attaque quand les barres se rejoignent au centre du viseur pour faire plus de dégâts (aucune pénalité sinon).
- **3 quartiers** : Vieux-Québec néon, Saint-Roch néon, Le Pont de glace, chacun avec 3 vagues et un boss.
- **Dépanneur Néon** : dépense tes piasses néon entre les vagues.
- Clavier/souris, manette et écran tactile.
- **Plein écran** : bouton ⛶ en haut à droite (aussi dans le menu titre et le menu pause) ou touche **F**. Sur iPhone, Safari ne permet pas le vrai plein écran d'une page : le jeu passe en « pseudo plein écran » et, pour cacher la barre de Safari, il faut l'ajouter à l'écran d'accueil (Partager ▸ Sur l'écran d'accueil), où il se lance en plein écran.

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

## Ressenti des armes originales
La présentation distingue les six gestes : balayage et lancer frappé du Bâton,
recul et bordée de la Pelle-fusil, libération d'orbe et pulsation de l'Onde.
Les impacts ont une signature sonore par arme, regroupée par attaque ; une
élimination reste prioritaire dans le viseur. Les ennemis accusent visuellement
le choc, sans étourdissement ni modification du recul physique.

Cette passe ne change pas les dégâts, la cadence, la portée, les améliorations,
les sauvegardes ou la musique. Aucun remplacement Nerf. Les secousses utilisent
le réglage existant (zéro reste zéro) ; aucun nouvel arrêt d'image.

Tests déterministes sans navigateur, avec Node 22+ et l'historique Git local :
```
node --test tests/*.test.mjs
```
Ils comparent les calculs/événements de combat à la révision de référence
`8ce6e169fd13ae4461118bf2364c19fd64e4ae74`, et vérifient les enveloppes,
les marqueurs et la coalescence audio. Ils ne remplacent pas l'essai visuel,
l'écoute du mix et la mesure sur téléphone. Voir [GAME.md](GAME.md).
