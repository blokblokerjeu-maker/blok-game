# 🤖 Bot BLOK - Q-Learning

## Vue d'ensemble

Ce système implémente un bot IA pour BLOK utilisant le Q-Learning avec approximation de fonction. Le bot apprend à jouer en s'entraînant contre lui-même sur des milliers de parties.

## ⚡ Règles BLOK Importantes

Le bot implémente les règles suivantes :

### BLOK (pièces offensives)
- ✅ Se déplacent de 1-3 cases en avant ou en diagonale
- ✅ Peuvent capturer les BLOK adverses
- ✅ Peuvent sauter par-dessus **leurs propres pièces UNIQUEMENT**
- ❌ **NE PEUVENT PAS** sauter par-dessus des pièces adverses (BLOK ou BLOKER)

### BLOKER (pièces défensives - TRÈS PUISSANTES)
- ✅ **TÉLÉPORTATION** : Peuvent se déplacer sur **N'IMPORTE QUELLE case vide** du plateau (63 destinations possibles !)
- ❌ **NE PEUVENT PAS capturer** (ni BLOK ni BLOKER) - Purement défensif
- ✅ Bloquent les mouvements de 2-3 cases des BLOK adverses quand ils sont dans le chemin

### Plateau
- 8x8 cases (64 positions)
- Wrap-around vertical (plateau infini en hauteur)
- Colonnes fixes (a-h, pas de wrap)

### Victoire
- Capturer 4+ BLOK adverses avec au moins 1 d'écart
- Système de "dernier tour" quand un joueur atteint 4 captures

## Architecture

### 1. GameEngine.ts
Moteur de jeu simplifié et rapide pour les simulations d'entraînement.
- État du jeu (plateau, pièces, captures)
- Calcul des mouvements légaux
- Exécution des mouvements
- Détection de fin de partie

### 2. QLearningAgent.ts
Agent d'apprentissage par renforcement.
- **Approximation de fonction** : Utilise des features pour représenter l'état (plutôt qu'une table Q)
- **Epsilon-greedy** : Balance exploration/exploitation
- **TD-Learning** : Mise à jour des poids via Temporal Difference

### 3. train.ts
Script d'entraînement pour faire jouer le bot contre lui-même.
- Self-play sur N parties
- Sauvegarde périodique des poids
- Statistiques d'entraînement

### 4. BotGame.tsx
Composant React pour jouer contre le bot entraîné.

## Features utilisées

Le bot évalue chaque état avec ces features :

1. **Matériel**
   - `blokAdvantage` : Différence de BLOK sur le plateau
   - `blokerAdvantage` : Différence de BLOKER sur le plateau
   - `captureAdvantage` : Différence de captures

2. **Position**
   - `blokAdvancement` : Progression des BLOK
   - `centerControl` : Contrôle du centre
   - `blokProtection` : BLOK protégés

3. **Tactique**
   - `threatenedBloks` : BLOK en danger
   - `captureOpportunities` : Opportunités de capture
   - `mobility` : Nombre de mouvements possibles

4. **Stratégie**
   - `closeToVictory` : Proximité de la victoire
   - `inDanger` : Danger de perdre

## Récompenses

- **Victoire** : +100
- **Défaite** : -100
- **Capture d'un BLOK** : +10
- **Mouvement normal** : -0.1 (encourage les parties rapides)

## Utilisation

### Étape 1 : Installer les dépendances

```bash
npm install
npm install -D tsx @types/node
```

### Étape 2 : Entraîner le bot (local)

```bash
# Entraînement sur 1000 parties (recommandé)
npm run train-bot 1000

# Entraînement rapide (100 parties pour tester)
npm run train-bot 100

# Entraînement intensif (5000 parties pour un bot expert)
npm run train-bot 5000
```

L'entraînement va :
- Créer `bot-training-checkpoints/` avec des sauvegardes tous les 100 jeux
- Créer `bot-training-results/` avec les poids finaux et statistiques

### Étape 3 : Charger les poids dans le jeu

Après l'entraînement, charger les poids dans localStorage pour l'utiliser dans l'UI :

```javascript
// Dans la console du navigateur ou dans un script
const fs = require('fs');
const weights = fs.readFileSync('./bot-training-results/agent-black-final.json', 'utf-8');
localStorage.setItem('bot-weights-noir', weights);
```

Ou utilisez le script fourni :

```bash
npm run load-bot-weights
```

### Étape 4 : Jouer contre le bot

Dans votre composant principal (App.tsx), ajoutez le mode bot :

```tsx
import { BotGame } from './components/BotGame';

// ...
<BotGame playerColor="blanc" onBack={() => setMode('menu')} />
```

## Configuration de l'entraînement

Dans `train.ts`, vous pouvez ajuster :

```typescript
const trainer = new Trainer({
  numGames: 1000,           // Nombre de parties
  saveInterval: 100,        // Sauvegarder tous les N jeux
  maxMovesPerGame: 200,     // Limite de coups (évite boucles infinies)
  verbose: false            // Afficher chaque partie
});
```

Dans `QLearningAgent.ts` :

```typescript
new QLearningAgent('blanc', {
  learningRate: 0.2,        // α : Vitesse d'apprentissage
  discountFactor: 0.95,     // γ : Importance du futur
  explorationRate: 0.5,     // ε : Exploration initiale
  explorationDecay: 0.998,  // Décroissance de ε
  minExploration: 0.05      // ε minimum
});
```

## Sauvegarder les parties dans Supabase

Pour implémenter la sauvegarde des parties :

1. Modifier `train.ts` pour envoyer les parties à Supabase :

```typescript
import { supabase } from '../lib/supabase';

// Après chaque partie
await supabase.from('bot_training_games').insert({
  game_number: i,
  winner: result.winner,
  moves: result.moves,
  captures_white: result.capturesWhite,
  captures_black: result.capturesBlack,
  duration_ms: result.duration,
  agent_weights_snapshot: JSON.stringify(agent.getStats().weights)
});
```

2. Créer la table dans Supabase :

```sql
CREATE TABLE bot_training_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_number INTEGER NOT NULL,
  winner TEXT,
  moves INTEGER NOT NULL,
  captures_white INTEGER NOT NULL,
  captures_black INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  agent_weights_snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Mode "Bot en ligne"

Pour déployer le bot entraîné :

1. **Héberger les poids** : Uploader les fichiers JSON des poids sur Supabase Storage
2. **Charger dynamiquement** : Dans BotGame.tsx, charger depuis Supabase au lieu de localStorage
3. **API de jeu** : Créer une fonction edge pour que le bot joue côté serveur

```typescript
// Exemple de chargement depuis Supabase
const { data, error } = await supabase.storage
  .from('bot-weights')
  .download('agent-noir-expert.json');

if (data) {
  const weights = await data.text();
  bot.importWeights(weights);
}
```

## Améliorer le bot

### 1. Plus d'entraînement
Plus de parties = meilleur bot (recommandé : 5000-10000 parties)

### 2. Ajuster les hyperparamètres
Expérimenter avec différentes valeurs de α, γ, ε

### 3. Ajouter des features
Dans `extractFeatures()`, ajouter :
- Distance moyenne entre BLOK
- Patterns de position (formations)
- Contrôle des lignes clés

### 4. Deep Q-Learning (DQN)
Pour un bot encore plus fort, remplacer l'approximation linéaire par un réseau de neurones

## Performance attendue

Avec 1000 parties d'entraînement :
- **Niveau débutant** : Comprend les règles, fait des mouvements cohérents
- **Temps d'entraînement** : ~5-10 minutes (dépend du CPU)

Avec 5000+ parties :
- **Niveau intermédiaire** : Stratégies de capture, positionnement
- **Temps d'entraînement** : ~30-60 minutes

## Débogage

### Le bot fait des mouvements aléatoires
- Vérifier que les poids sont chargés (`bot.getStats().gamesPlayed` > 0)
- Réduire `explorationRate` à 0.05 en mode jeu

### L'entraînement est trop lent
- Réduire `numGames` pour tester
- Désactiver `verbose`
- Augmenter `maxMovesPerGame` si beaucoup de matchs nuls

### Le bot ne s'améliore pas
- Augmenter `learningRate`
- Vérifier les récompenses (afficher dans la console)
- Essayer plus de parties

## Résultats

Après l'entraînement, consultez :
- `bot-training-results/training-stats.json` : Statistiques globales
- `bot-training-results/game-results.csv` : Détails de chaque partie
- `bot-training-results/agent-*.json` : Poids finaux des agents

## Licence

MIT
