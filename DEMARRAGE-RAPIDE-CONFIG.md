# 🚀 Démarrage Rapide - Configuration Modulable

## ✅ Le système est prêt !

Le système de configuration modulable du jeu BLOK est **entièrement implémenté** et fonctionnel.

---

## 🎮 Comment Jouer avec une Configuration Personnalisée

### Option 1 : Jeu Local (2 joueurs sur le même écran)

1. Lancez l'application
2. Connectez-vous au lobby
3. Cliquez sur **"🎮 Jouer en local"**
4. **L'écran de configuration apparaît** :
   - Choisissez le nombre de BLOKs (4, 6, ou 8)
   - Choisissez le nombre de BLOKERs (2, 3, ou 4)
   - Sélectionnez le type de plateau (8x8, 6x8, 4x8, ou 8x8 sans coins)
   - Définissez l'objectif de victoire (1 à 8 BLOKs à capturer)
5. Cliquez sur **"Commencer la partie"**
6. Jouez ! 🎉

### Option 2 : Jeu contre le Bot

1. Lancez l'application
2. Connectez-vous au lobby
3. Cliquez sur **"🤖 Jouer contre le Bot"**
4. **L'écran de configuration apparaît** (même interface que pour le jeu local)
5. Configurez votre partie
6. Choisissez votre couleur (⚪ Blanc ou ⚫ Noir)
7. Jouez contre l'IA avec vos règles ! 🤖

---

## 🎯 Exemples de Configurations Amusantes

### ⚡ Blitz (Partie rapide)
- **Plateau** : 4x8
- **BLOKs** : 4
- **BLOKERs** : 2
- **Objectif** : 2 captures
- 🎮 Parties ultra-rapides en 5-10 minutes !

### 🧩 Tactique Avancée
- **Plateau** : 8x8 sans coins
- **BLOKs** : 6
- **BLOKERs** : 3
- **Objectif** : 3 captures
- 🎮 Plus de stratégie avec les zones inaccessibles !

### 🏆 Marathon
- **Plateau** : 8x8
- **BLOKs** : 8
- **BLOKERs** : 4
- **Objectif** : 6 captures
- 🎮 Partie longue et intense !

### 🎲 Minimaliste
- **Plateau** : 4x8
- **BLOKs** : 4
- **BLOKERs** : 2
- **Objectif** : 1 capture
- 🎮 Première capture = victoire !

---

## 📋 Types de Plateaux Disponibles

| Type | Dimensions | Cases | Description |
|------|-----------|-------|-------------|
| **8x8** | 8 colonnes × 8 lignes | 64 | Plateau classique |
| **6x8** | 6 colonnes × 8 lignes | 48 | Plateau étroit |
| **4x8** | 4 colonnes × 8 lignes | 32 | Mini plateau |
| **8x8 sans coins** | 8 colonnes × 8 lignes | 60 | Plateau avec coins désactivés |

---

## 🎨 Interface de Configuration

L'interface vous permet de :
- ✅ Voir en temps réel votre configuration
- ✅ Consulter un récapitulatif avant de jouer
- ✅ Validation automatique (impossible de créer une config invalide)
- ✅ Boutons désactivés pour les options incompatibles

---

## 🔍 Règles Importantes

### Placement des Pièces
- Les **BLOKs** sont toujours placés sur la **première ligne** (centrés)
- Les **BLOKERs** sont toujours placés sur la **deuxième ligne** (centrés)

### Plateau Infini
- Le **wrap-around** (plateau infini) fonctionne **uniquement verticalement**
- Les colonnes **ne wrappent pas** (pas de passage d'un bord à l'autre)

### Plateau 8x8 sans Coins
- Les **4 coins** sont **désactivés** (cases noires avec ✕)
- Les pièces **ne peuvent pas** s'y déplacer ou s'y téléporter
- Total : **60 cases** utilisables au lieu de 64

### Objectif de Victoire
- L'objectif **ne peut jamais dépasser** le nombre de BLOKs
- Système de **dernier tour** : quand un joueur atteint l'objectif avec un écart, l'adversaire a un dernier tour pour égaliser
- Victoire = Objectif atteint **avec un écart** après le dernier tour

---

## 🛠️ Pour les Développeurs

### Fichiers Principaux
```
src/
├── types/
│   └── GameConfig.ts          # Types et configuration
├── utils/
│   └── boardSetup.ts          # Génération de plateau
├── components/
│   └── GameSettingsScreen.tsx # Interface de config
├── LocalGame.tsx              # Jeu local (adapté)
├── bot/
│   └── GameEngine.ts          # Moteur (adapté)
└── components/
    └── BotGame.tsx            # Jeu bot (adapté)
```

### Utiliser une Configuration Programmatiquement
```typescript
import type { GameConfig } from './types/GameConfig';
import { DEFAULT_CONFIG } from './types/GameConfig';

// Configuration personnalisée
const myConfig: GameConfig = {
  blokCount: 6,
  blokerCount: 3,
  movesPerTurn: 1,
  boardType: '8x8-no-corners',
  captureGoal: 3
};

// Créer un jeu avec cette config
const engine = new GameEngine(myConfig);
```

### Ajouter un Nouveau Type de Plateau
1. Ajouter le type dans `BoardType` (GameConfig.ts)
2. Ajouter le cas dans `getBoardInfo()` (GameConfig.ts)
3. Définir `width`, `height`, `totalCells`, `disabledCells`
4. Tester avec différentes configurations de pièces

---

## 🐛 Résolution de Problèmes

### Les pièces ne sont pas centrées
- ✅ C'est normal sur certains plateaux (4x8 avec 8 BLOKs = impossible)
- ✅ Le système désactive automatiquement les configurations invalides

### Le bot ne fonctionne pas sur plateau personnalisé
- ✅ Le bot est compatible avec tous les plateaux
- ⚠️ Les poids pré-entraînés ont été entraînés sur 8x8 classique
- 💡 Le bot peut être moins performant sur d'autres configurations

### Erreurs TypeScript après modification
- ✅ Vérifiez que tous les imports sont corrects
- ✅ Relancez `npm run dev` pour recompiler

---

## 📞 Support

Pour plus de détails techniques :
- 📖 Consultez `GUIDE-MODULATION-REGLES.md` (guide complet étape par étape)
- 📖 Consultez `SYSTEME-CONFIGURATION-COMPLETE.md` (résumé de l'implémentation)

---

## 🎉 Amusez-vous bien !

Le système de configuration vous permet de créer une expérience de jeu **unique** à chaque partie. Explorez toutes les possibilités et trouvez votre configuration préférée ! 🚀
