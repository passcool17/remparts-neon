# Remparts Néon — contrat de jeu et revue du ressenti

## Boucle existante
Survie à la première personne : choisir une arme originale, traverser les vagues,
affronter les boss et acheter des améliorations au Dépanneur Néon. Attaquer sur
le beat donne le bonus existant ; tirer autrement reste permis. Histoire et
Survie, difficulté et progression restent inchangées. La radio CNÉO 88,8 est
un affichage texte avec blips, accompagné de trance procédurale.

## Trois armes, six signatures
| Arme | Primaire | Spécial | Présentation |
|---|---|---|---|
| Bâton | Balayage de mêlée | Rondelle | Traversée latérale, suivi continu ; lancer frappé vers l'avant |
| Pelle-fusil | Tir à répétition | Bordée | Impulsion sèche et récupération ; recul plus ample pour la bordée |
| Onde | Orbe à explosion | Pulsation | Libération et retour du noyau ; projection/expansion plus ample au spécial |

Les mouvements concernent uniquement le modèle tenu : ni visée réelle ni
origine/direction de tir déplacées. Les dégâts restent immédiats au même point
du traitement. Les sons de départ sont distincts des impacts. Les impacts
multiples d'une attaque sont regroupés, avec une séparation minimale de 45 ms
entre confirmations audio ; les nombres de dégâts et éliminations ne sont
pas regroupés par ce filtre. La mémoire des identifiants est limitée à 16.
La mort garde son son original et son marqueur prioritaire pendant 220 ms.
Un impact de priorité plus faible ne rafraîchit volontairement pas le marqueur
actif : un impact normal ne prolonge donc ni le killmarker ni le marqueur beat.
La séparation audio de 45 ms est globale, en plus de la coalescence par attaque.
Les gestes repartent du déplacement courant lors d'un nouveau tir, y compris
à cadence améliorée maximale ; chaque canal garde son propre gain beat pour
éviter une rupture quand primaire et spécial se chevauchent.

La réaction ennemie est une rotation additive du corps pendant 200 ms au plus,
sans stun/collision/ralentissement supplémentaire. Boss et déneigeuses gardent
leur résistance physique ; leur réaction visuelle est atténuée. Les budgets
FX existants restent identiques (1400/3200 particules low/high, 64 tracers,
14 flashes). Pas de nouveaux effets plein écran ni de nouveau hitstop.

## Invariants de cette passe
- Calculs de dégâts, critiques, bonus beat, cibles, portées, projectiles et cadence.
- Recharge des spéciaux, esquive, achats, récompenses, sauvegardes et progression.
- Cartes, musique, radio, difficulté, clavier, souris, manette, tactile et tir auto.
- Même consommation de hasard par le combat : les nouvelles couches de bruit
  utilisent un décalage explicite, pas de tirage aléatoire supplémentaire.
- Réglage secousse existant, zéro sans secousse ; curseurs musique/effets respectés.

## Commandes utiles à la revue
Clic gauche : primaire. Clic droit ou E : spécial. RT/LT sur manette ; FEU et
SPÉCIAL en tactile. F ou ⛶ : plein écran. P : pause/reprise.
`node tools/serve.js 8765` pour servir localement.
`?q=low&touch` pour la revue tactile basse qualité (ne remplace pas un téléphone).

## Checklist manuelle avant toute publication
- [ ] Chaque arme, primaire et spécial : raté, impact survivant, élimination.
- [ ] Bâton : balayage sans saut au retour ; rondelle distincte, renvoi inchangé.
- [ ] Pelle : tirs isolés et maintien à cadence max ; bordée distincte sans mur sonore.
- [ ] Onde : orbe, explosion, pulsation et chaînes améliorées ; six gestes identifiables.
- [ ] Beat/non-beat, coups critiques, boss et résistance des déneigeuses inchangés.
- [ ] Killmarker non écrasé par les plombs/cibles suivants ; expiration normale.
- [ ] Son impact différent du tir à vide ; son de mort encore audible ; ni saturation
      ni masquage excessif de la musique/radio, effets=0 et musique=0 séparément.
- [ ] Pause en plein geste, reprise, nouvelle partie, boutique et respawn : pas de
      geste, flash ou historique d'impact résiduel ; cadence identique après reprise.
- [ ] Secousse=0 : aucune nouvelle secousse ; mouvement d'arme sans déplacer la visée.
- [ ] Clavier/souris, manette, tactile et tir auto ; low/high, plein écran.
- [ ] Téléphone réel : stabilité et lisibilité en horde dense, aucune console error.

## Vérification automatisée et limites
`node --test tests/*.test.mjs` : enveloppes, priorité, coalescence, reset,
consommation RNG audio, continuité des retriggers (0,1 s et cadences maximales
améliorées pour les six gestes, avec changement beat et chevauchement), plus 96 scénarios comparatifs de combat (3 armes ×
primaire/spécial × base/amélioré × beat/non-beat × touché/raté × mort/survie).
Les fonctions de combat réelles sont exécutées en VM Node avec vecteurs Three.js
et entrées déterministes. Les sorties visuelles/audio y sont remplacées par des
collecteurs : cela ne prouve ni la qualité sonore ni le rendu WebGL. D'autres
assertions protègent les blocs de cadence/déplacement, physique des projectiles,
morts/récompenses et fichiers hors périmètre contre une modification accidentelle.
Les scripts navigateur historiques `tools/bot.js`, `tools/touch.js` et
`tools/smoke.js` sont des vérifications supplémentaires, pas exécutées par cette
passe Node. La checklist manuelle reste à valider par le coordinateur.
