# 🎮 BLOK - Jeu de Stratégie

BLOK est un jeu de stratégie sur plateau 8x8 avec des règles uniques et un bot IA utilisant le Q-Learning.

## 🌟 Fonctionnalités

- ✅ **Jeu local** : Jouez à deux sur le même ordinateur
- ✅ **Bot IA** : Affrontez un bot entraîné avec Q-Learning
- ✅ **Entraînement du bot** : Entraînez votre propre bot sur N parties
- ✅ **Mode en ligne** : Infrastructure prête pour jouer en ligne via Supabase
- ✅ **Interface moderne** : UI responsive avec animations

## 🚀 Démarrage Rapide

### Installation

```bash
npm install
```

### Lancer le jeu

```bash
npm run dev
```

Visitez http://localhost:5173

### Entraîner le bot (optionnel)

```bash
# Entraînement sur 1000 parties (~5-10 min)
npm run train-bot 1000

# Charger les poids dans le navigateur
npm run load-bot-weights
```

## 📖 Documentation

- **[Guide de Démarrage Rapide du Bot](./GUIDE-BOT-QUICKSTART.md)** - Pour commencer avec le bot
- **[Résumé de l'Implémentation](./BOT-IMPLEMENTATION-SUMMARY.md)** - Détails techniques
- **[Documentation Technique du Bot](./src/bot/README.md)** - Architecture Q-Learning

## 🎯 Règles du Jeu BLOK

### Pièces
- **BLOK** : 8 pièces offensives par joueur
  - Se déplacent de 1-3 cases en avant ou en diagonale
  - Peuvent capturer les BLOK adverses
  - Peuvent sauter par-dessus leurs propres pièces UNIQUEMENT
  - **NE PEUVENT PAS** sauter par-dessus des pièces adverses (BLOK ou BLOKER)
  
- **BLOKER** : 4 pièces défensives par joueur
  - **Téléportation** : Peuvent se déplacer sur N'IMPORTE QUELLE case vide du plateau
  - **NE PEUVENT PAS capturer** (ni BLOK ni BLOKER)
  - Bloquent les mouvements de 2-3 cases des BLOK adverses quand ils sont dans le chemin

### Plateau
- 8x8 cases (64 positions)
- **Wrap-around vertical** : Le plateau est infini verticalement
- Les colonnes ne "wrappe" pas (limitées à a-h)

### Victoire
Capturer **4 BLOK adverses ou plus** avec **au moins 1 d'écart**
- Quand un joueur atteint 4 captures avec écart → Dernier tour pour l'adversaire
- L'adversaire peut égaliser pour continuer la partie

## 🤖 Bot Q-Learning

Le bot utilise l'apprentissage par renforcement (Q-Learning) avec approximation de fonction.

### Architecture
- **GameEngine** : Moteur de jeu optimisé pour simulations rapides
- **QLearningAgent** : Agent avec 11 features engineered
- **Self-play** : Le bot s'entraîne en jouant contre lui-même
- **TD-Learning** : Apprentissage par différence temporelle

### Performance
- **1000 parties** (~10 min) : Niveau débutant avancé
- **5000 parties** (~1h) : Niveau intermédiaire
- **10000+ parties** (~2h) : Niveau avancé

### Features utilisées
1. Avantage matériel (BLOK, BLOKER)
2. Avantage de captures
3. Progression des pièces
4. Contrôle du centre
5. Protection des BLOK
6. Pièces menacées
7. Opportunités de capture
8. Mobilité
9. Proximité de victoire
10. Niveau de danger

## 📁 Structure du Projet

```
my-game/
├── src/
│   ├── bot/                     # 🤖 Système de bot Q-Learning
│   │   ├── GameEngine.ts        # Moteur de jeu pour simulations
│   │   ├── QLearningAgent.ts    # Agent d'apprentissage
│   │   ├── train.ts             # Script d'entraînement
│   │   └── README.md            # Documentation technique
│   ├── components/
│   │   └── BotGame.tsx          # UI pour jouer contre le bot
│   ├── LocalGame.tsx            # Jeu local (2 joueurs)
│   ├── App.tsx                  # Composant principal
│   └── App.css                  # Styles
├── scripts/
│   ├── train-bot.ts             # CLI pour entraîner le bot
│   └── load-bot-weights.ts      # CLI pour charger les poids
├── supabase-bot-schema.sql      # Schéma SQL pour Supabase
├── GUIDE-BOT-QUICKSTART.md      # Guide de démarrage rapide
└── BOT-IMPLEMENTATION-SUMMARY.md # Résumé technique
```

## 🛠️ Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Supabase** - Backend (optionnel pour mode en ligne)
- **Q-Learning** - IA du bot (pure TypeScript, pas de ML libs)

## 📊 Commandes Disponibles

```bash
# Développement
npm run dev              # Lancer le serveur de dev
npm run build            # Build pour production
npm run preview          # Prévisualiser le build

# Bot IA
npm run train-bot 1000   # Entraîner le bot sur 1000 parties
npm run load-bot-weights # Charger les poids dans le navigateur
```

## 🎮 Modes de Jeu

### 1. Jeu Local
Jouez à deux sur le même ordinateur. Parfait pour découvrir les règles !

### 2. Jouer contre le Bot
Affrontez un bot entraîné avec Q-Learning. Choisissez votre couleur et commencez !

### 3. Mode En Ligne (à venir)
Infrastructure prête pour jouer en ligne via Supabase.

## 🚀 Prochaines Étapes

1. **Testez le jeu local** pour comprendre les règles
2. **Entraînez un bot** avec `npm run train-bot 100` (test rapide)
3. **Intégrez le bot** dans l'UI avec le code d'exemple
4. **Ajustez et améliorez** selon vos besoins

## 📚 En Savoir Plus

- [Guide du Bot](./GUIDE-BOT-QUICKSTART.md) - Démarrage rapide du bot
- [Implémentation](./BOT-IMPLEMENTATION-SUMMARY.md) - Détails techniques
- [Doc Q-Learning](./src/bot/README.md) - Architecture de l'IA

## 📝 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une PR.

---

**Fait avec ❤️ et du TypeScript**
