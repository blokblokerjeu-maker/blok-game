# Guide Step-by-Step : Système de Modulation des Règles du Jeu BLOK

Ce guide vous permettra d'implémenter un système complet de configuration personnalisable pour le jeu BLOK.

## 📋 Vue d'ensemble

Le système permettra de configurer :
- **Nombre de BLOKs** (sur la première ligne) : 4, 6, ou 8
- **Nombre de BLOKERs** (sur la deuxième ligne) : 2, 3, ou 4
- **Nombre de coups par tour** : 1 ou 2
- **Type de plateau** : 
  - 8x8 standard (64 cases)
  - 6x8 (48 cases)
  - 4x8 (32 cases)
  - 8x8 sans coins (60 cases)
- **Objectif de victoire** : nombre de BLOKs adverses à éliminer (1-8)

---

## 🔧 ÉTAPE 1 : Créer les types TypeScript pour la configuration

### Fichier à créer : `/src/types/GameConfig.ts`

```typescript
/**
 * Types de plateaux disponibles
 */
export type BoardType = 
  | '8x8'      // 64 cases standard
  | '6x8'      // 48 cases
  | '4x8'      // 32 cases
  | '8x8-no-corners'; // 60 cases (sans les 4 coins)

/**
 * Configuration complète d'une partie
 */
export interface GameConfig {
  // Nombre de BLOKs par joueur (sur la première ligne)
  blokCount: number; // 4, 6, ou 8
  
  // Nombre de BLOKERs par joueur (sur la deuxième ligne)
  blokerCount: number; // 2, 3, ou 4
  
  // Nombre de coups par tour
  movesPerTurn: 1 | 2;
  
  // Type de plateau
  boardType: BoardType;
  
  // Nombre de BLOKs adverses à capturer pour gagner
  captureGoal: number; // 1 à 8
}

/**
 * Configuration par défaut (règles classiques)
 */
export const DEFAULT_CONFIG: GameConfig = {
  blokCount: 8,
  blokerCount: 4,
  movesPerTurn: 1,
  boardType: '8x8',
  captureGoal: 4
};

/**
 * Informations sur le plateau selon le type
 */
export interface BoardInfo {
  width: number;
  height: number;
  totalCells: number;
  disabledCells: number[]; // Cases désactivées (pour 8x8-no-corners)
  getIndex: (row: number, col: number) => number | null;
  getRowCol: (index: number) => { row: number; col: number } | null;
}

/**
 * Retourne les informations du plateau selon le type
 */
export function getBoardInfo(boardType: BoardType): BoardInfo {
  switch (boardType) {
    case '8x8':
      return {
        width: 8,
        height: 8,
        totalCells: 64,
        disabledCells: [],
        getIndex: (row, col) => {
          if (row < 0 || row >= 8 || col < 0 || col >= 8) return null;
          return row * 8 + col;
        },
        getRowCol: (index) => {
          if (index < 0 || index >= 64) return null;
          return { row: Math.floor(index / 8), col: index % 8 };
        }
      };
    
    case '6x8':
      return {
        width: 6,
        height: 8,
        totalCells: 48,
        disabledCells: [],
        getIndex: (row, col) => {
          if (row < 0 || row >= 8 || col < 0 || col >= 6) return null;
          return row * 6 + col;
        },
        getRowCol: (index) => {
          if (index < 0 || index >= 48) return null;
          return { row: Math.floor(index / 6), col: index % 6 };
        }
      };
    
    case '4x8':
      return {
        width: 4,
        height: 8,
        totalCells: 32,
        disabledCells: [],
        getIndex: (row, col) => {
          if (row < 0 || row >= 8 || col < 0 || col >= 4) return null;
          return row * 4 + col;
        },
        getRowCol: (index) => {
          if (index < 0 || index >= 32) return null;
          return { row: Math.floor(index / 4), col: index % 4 };
        }
      };
    
    case '8x8-no-corners':
      return {
        width: 8,
        height: 8,
        totalCells: 60, // 64 - 4 coins
        disabledCells: [0, 7, 56, 63], // coins désactivés
        getIndex: (row, col) => {
          if (row < 0 || row >= 8 || col < 0 || col >= 8) return null;
          const index = row * 8 + col;
          if ([0, 7, 56, 63].includes(index)) return null; // coins
          return index;
        },
        getRowCol: (index) => {
          if (index < 0 || index >= 64) return null;
          if ([0, 7, 56, 63].includes(index)) return null; // coins
          return { row: Math.floor(index / 8), col: index % 8 };
        }
      };
  }
}
```

---

## 🎨 ÉTAPE 2 : Créer l'interface de configuration

### Fichier à créer : `/src/components/GameSettingsScreen.tsx`

```typescript
import { useState } from 'react';
import type { GameConfig, BoardType } from '../types/GameConfig';
import { DEFAULT_CONFIG } from '../types/GameConfig';
import '../App.css';

interface GameSettingsScreenProps {
  onStartGame: (config: GameConfig) => void;
  onBack?: () => void;
  title?: string;
}

export function GameSettingsScreen({ 
  onStartGame, 
  onBack,
  title = "Configuration de la partie"
}: GameSettingsScreenProps) {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  const updateConfig = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="game-container">
      <div className="settings-screen">
        <h1 className="game-title">{title}</h1>
        
        <div className="settings-container">
          {/* Nombre de BLOKs */}
          <div className="setting-group">
            <label className="setting-label">Nombre de BLOKs par joueur</label>
            <div className="setting-options">
              {[4, 6, 8].map(count => (
                <button
                  key={count}
                  className={`setting-option ${config.blokCount === count ? 'selected' : ''}`}
                  onClick={() => updateConfig('blokCount', count)}
                >
                  {count} BLOKs
                </button>
              ))}
            </div>
            <p className="setting-description">BLOKs placés sur la première ligne</p>
          </div>

          {/* Nombre de BLOKERs */}
          <div className="setting-group">
            <label className="setting-label">Nombre de BLOKERs par joueur</label>
            <div className="setting-options">
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  className={`setting-option ${config.blokerCount === count ? 'selected' : ''}`}
                  onClick={() => updateConfig('blokerCount', count)}
                >
                  {count} BLOKERs
                </button>
              ))}
            </div>
            <p className="setting-description">BLOKERs placés sur la deuxième ligne</p>
          </div>

          {/* Type de plateau */}
          <div className="setting-group">
            <label className="setting-label">Type de plateau</label>
            <div className="setting-options">
              <button
                className={`setting-option ${config.boardType === '8x8' ? 'selected' : ''}`}
                onClick={() => updateConfig('boardType', '8x8' as BoardType)}
              >
                8x8<br/><small>(64 cases)</small>
              </button>
              <button
                className={`setting-option ${config.boardType === '6x8' ? 'selected' : ''}`}
                onClick={() => updateConfig('boardType', '6x8' as BoardType)}
              >
                6x8<br/><small>(48 cases)</small>
              </button>
              <button
                className={`setting-option ${config.boardType === '4x8' ? 'selected' : ''}`}
                onClick={() => updateConfig('boardType', '4x8' as BoardType)}
              >
                4x8<br/><small>(32 cases)</small>
              </button>
              <button
                className={`setting-option ${config.boardType === '8x8-no-corners' ? 'selected' : ''}`}
                onClick={() => updateConfig('boardType', '8x8-no-corners' as BoardType)}
              >
                8x8 sans coins<br/><small>(60 cases)</small>
              </button>
            </div>
          </div>

          {/* Coups par tour */}
          <div className="setting-group">
            <label className="setting-label">Coups par tour</label>
            <div className="setting-options">
              <button
                className={`setting-option ${config.movesPerTurn === 1 ? 'selected' : ''}`}
                onClick={() => updateConfig('movesPerTurn', 1)}
              >
                1 coup
              </button>
              <button
                className={`setting-option ${config.movesPerTurn === 2 ? 'selected' : ''}`}
                onClick={() => updateConfig('movesPerTurn', 2)}
              >
                2 coups
              </button>
            </div>
            <p className="setting-description">Nombre de mouvements autorisés par tour</p>
          </div>

          {/* Objectif de victoire */}
          <div className="setting-group">
            <label className="setting-label">Objectif de victoire</label>
            <div className="setting-options">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(goal => (
                <button
                  key={goal}
                  className={`setting-option small ${config.captureGoal === goal ? 'selected' : ''}`}
                  onClick={() => updateConfig('captureGoal', goal)}
                  disabled={goal > config.blokCount}
                >
                  {goal}
                </button>
              ))}
            </div>
            <p className="setting-description">
              Nombre de BLOKs adverses à capturer pour gagner
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="settings-actions">
            <button 
              className="play-button"
              onClick={() => onStartGame(config)}
            >
              Commencer la partie
            </button>
            {onBack && (
              <button className="back-button" onClick={onBack}>
                ← Retour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔨 ÉTAPE 3 : Créer les fonctions utilitaires

### Fichier à créer : `/src/utils/boardSetup.ts`

```typescript
import type { GameConfig, BoardInfo } from '../types/GameConfig';
import { getBoardInfo } from '../types/GameConfig';

export type PieceType = 'blok-blanc' | 'blok-noir' | 'bloker-blanc' | 'bloker-noir' | null;

/**
 * Génère la position initiale des pièces selon la configuration
 */
export function generateInitialBoard(config: GameConfig): Record<number, PieceType> {
  const boardInfo = getBoardInfo(config.boardType);
  const board: Record<number, PieceType> = {};
  
  // Initialiser toutes les cases à null
  for (let i = 0; i < boardInfo.totalCells; i++) {
    board[i] = null;
  }
  
  // Placer les BLOKs NOIRS (première ligne - ligne 0)
  placePiecesOnLine(
    board, 
    boardInfo, 
    0, // ligne du haut
    config.blokCount, 
    'blok-noir'
  );
  
  // Placer les BLOKERs NOIRS (deuxième ligne - ligne 1)
  placePiecesOnLine(
    board, 
    boardInfo, 
    1, 
    config.blokerCount, 
    'bloker-noir'
  );
  
  // Placer les BLOKERs BLANCS (avant-dernière ligne)
  placePiecesOnLine(
    board, 
    boardInfo, 
    boardInfo.height - 2, 
    config.blokerCount, 
    'bloker-blanc'
  );
  
  // Placer les BLOKs BLANCS (dernière ligne)
  placePiecesOnLine(
    board, 
    boardInfo, 
    boardInfo.height - 1, 
    config.blokCount, 
    'blok-blanc'
  );
  
  return board;
}

/**
 * Place des pièces centrées sur une ligne
 */
function placePiecesOnLine(
  board: Record<number, PieceType>,
  boardInfo: BoardInfo,
  row: number,
  count: number,
  pieceType: PieceType
): void {
  const { width } = boardInfo;
  
  // Calculer la position de départ pour centrer les pièces
  const startCol = Math.floor((width - count) / 2);
  
  for (let i = 0; i < count; i++) {
    const col = startCol + i;
    const index = boardInfo.getIndex(row, col);
    
    if (index !== null) {
      board[index] = pieceType;
    }
  }
}

/**
 * Vérifie si une case est valide pour le plateau
 */
export function isValidCell(index: number, boardInfo: BoardInfo): boolean {
  if (index < 0 || index >= boardInfo.totalCells) return false;
  return !boardInfo.disabledCells.includes(index);
}

/**
 * Calcule l'index avec wrap-around pour le plateau infini
 */
export function getWrappedIndex(
  row: number, 
  col: number, 
  boardInfo: BoardInfo
): number | null {
  // Wrap-around vertical seulement
  const wrappedRow = ((row % boardInfo.height) + boardInfo.height) % boardInfo.height;
  
  // Les colonnes ne wrappent pas
  if (col < 0 || col >= boardInfo.width) return null;
  
  const index = boardInfo.getIndex(wrappedRow, col);
  
  // Vérifier si la case n'est pas désactivée
  if (index !== null && boardInfo.disabledCells.includes(index)) return null;
  
  return index;
}
```

---

## 🎮 ÉTAPE 4 : Adapter LocalGame.tsx

Voici les modifications clés à apporter :

1. **Ajouter la prop `config`** :
```typescript
type LocalGameProps = {
  onBack?: () => void;
  config?: GameConfig; // NOUVEAU
}

function LocalGame({ onBack, config = DEFAULT_CONFIG }: LocalGameProps) {
```

2. **Remplacer l'initialisation du plateau** :
```typescript
import { generateInitialBoard } from './utils/boardSetup';
import { getBoardInfo } from './types/GameConfig';

const [pieces, setPieces] = useState<Record<number, PieceType>>(() => 
  generateInitialBoard(config)
);

const boardInfo = getBoardInfo(config.boardType);
```

3. **Adapter le rendu du plateau** :
```typescript
const renderBoard = () => {
  const cells = [];
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].slice(0, boardInfo.width);
  
  for (let i = 0; i < boardInfo.totalCells; i++) {
    // Vérifier si la case est désactivée
    if (boardInfo.disabledCells.includes(i)) {
      cells.push(
        <div key={i} className="board-cell disabled">
          {/* Case désactivée (coin) */}
        </div>
      );
      continue;
    }
    
    // ... reste du code de rendu
  }
  
  return cells;
}
```

4. **Adapter la condition de victoire** :
```typescript
// Utiliser config.captureGoal au lieu de 4
if (newCapturedWhite >= config.captureGoal && newCapturedWhite > newCapturedBlack) {
  setWinner('noir');
}
```

5. **Adapter les fonctions de mouvement** pour utiliser `boardInfo` et `getWrappedIndex` de `boardSetup.ts`

---

## ⚙️ ÉTAPE 5 : Adapter GameEngine.ts

1. **Ajouter config au constructeur** :
```typescript
export class GameEngine {
  private state: GameState;
  private config: GameConfig; // NOUVEAU
  private boardInfo: BoardInfo; // NOUVEAU

  constructor(config: GameConfig = DEFAULT_CONFIG, initialState?: GameState) {
    this.config = config;
    this.boardInfo = getBoardInfo(config.boardType);
    
    if (initialState) {
      this.state = { ...initialState };
    } else {
      this.state = this.getInitialState();
    }
  }
```

2. **Adapter getInitialState** :
```typescript
private getInitialState(): GameState {
  return {
    pieces: generateInitialBoard(this.config),
    currentPlayer: 'blanc',
    capturedBloksWhite: 0,
    capturedBloksBlack: 0,
    lastTurnPlayer: null,
    winner: null,
    moveHistory: []
  };
}
```

3. **Adapter les fonctions de mouvement** pour utiliser `this.boardInfo` et supporter les mouvements multiples si `config.movesPerTurn === 2`

4. **Adapter checkWinConditions** :
```typescript
if (capturedWhite >= this.config.captureGoal && capturedWhite > capturedBlack) {
  this.state.winner = 'noir';
}
```

---

## 🤖 ÉTAPE 6 : Adapter BotGame.tsx

```typescript
interface BotGameProps {
  onBack?: () => void;
  playerColor: PlayerColor;
  config?: GameConfig; // NOUVEAU
}

export function BotGame({ 
  onBack, 
  playerColor = 'blanc',
  config = DEFAULT_CONFIG // NOUVEAU
}: BotGameProps) {
  const [engine, setEngine] = useState<GameEngine>(() => 
    new GameEngine(config) // Passer la config
  );
  
  // ... reste du code
}
```

---

## 🌐 ÉTAPE 7 : Adapter Lobby.tsx

Modifier la fonction `sendInvitation` pour inclure la configuration :

```typescript
const sendInvitation = async (toUserId: string, gameConfig: GameConfig) => {
  setLoading(true);
  try {
    const { error } = await supabase
      .from('game_invitations')
      .insert({
        from_user_id: profile?.id,
        to_user_id: toUserId,
        game_config: JSON.stringify(gameConfig) // NOUVEAU
      });

    if (error) throw error;
    alert('Invitation envoyée !');
  } catch (error: any) {
    alert('Erreur : ' + error.message);
  } finally {
    setLoading(false);
  }
};
```

Ajouter un état pour la configuration et un écran de sélection avant d'inviter.

---

## 💾 ÉTAPE 8 : Mettre à jour le schéma Supabase

Créer un fichier SQL pour ajouter la colonne `game_config` :

```sql
-- Ajouter la colonne game_config aux invitations
ALTER TABLE game_invitations 
ADD COLUMN game_config JSONB DEFAULT NULL;

-- Ajouter la colonne game_config aux parties
ALTER TABLE games 
ADD COLUMN game_config JSONB DEFAULT NULL;

-- Index pour rechercher par type de configuration
CREATE INDEX idx_games_config ON games USING gin(game_config);
```

---

## 🎯 ÉTAPE 9 : Adapter MultiplayerGame.tsx

Charger et utiliser la configuration depuis la base de données :

```typescript
// Charger la config depuis la partie
useEffect(() => {
  loadGameConfig();
}, [gameId]);

const loadGameConfig = async () => {
  const { data, error } = await supabase
    .from('games')
    .select('game_config')
    .eq('id', gameId)
    .single();
    
  if (data && data.game_config) {
    const config = JSON.parse(data.game_config);
    setGameConfig(config);
  }
};
```

---

## 🎨 ÉTAPE 10 : Ajouter les styles CSS

Ajouter dans `App.css` :

```css
/* Écran de configuration */
.settings-screen {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.settings-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.setting-group {
  margin-bottom: 35px;
  padding-bottom: 25px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.setting-group:last-of-type {
  border-bottom: none;
}

.setting-label {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 15px;
}

.setting-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.setting-option {
  flex: 1;
  min-width: 100px;
  padding: 15px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
  font-weight: 500;
}

.setting-option.small {
  flex: 0 0 auto;
  min-width: 60px;
  padding: 12px 16px;
}

.setting-option:hover:not(:disabled) {
  border-color: #667eea;
  background: #f7fafc;
  transform: translateY(-2px);
}

.setting-option.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.setting-option:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.setting-description {
  margin-top: 10px;
  font-size: 14px;
  color: #718096;
  font-style: italic;
}

.settings-actions {
  margin-top: 30px;
  display: flex;
  gap: 15px;
  justify-content: center;
}

/* Case désactivée (coins) */
.board-cell.disabled {
  background: #1a1a1a !important;
  cursor: not-allowed;
  opacity: 0.3;
}
```

---

## ✅ ÉTAPE 11 : Intégration dans App.tsx

Modifier le flux pour inclure l'écran de configuration :

```typescript
type GameMode = 'lobby' | 'local' | 'local-settings' | 'multiplayer' | 'bot' | 'bot-settings';

// Pour le jeu local
if (gameMode === 'local-settings') {
  return (
    <GameSettingsScreen
      title="Jeu Local - Configuration"
      onStartGame={(config) => {
        setLocalGameConfig(config);
        setGameMode('local');
      }}
      onBack={() => setGameMode('lobby')}
    />
  );
}

if (gameMode === 'local') {
  return (
    <LocalGame 
      config={localGameConfig}
      onBack={() => setGameMode('lobby')} 
    />
  );
}

// Similaire pour bot-settings et bot
```

---

## 🧪 ÉTAPE 12 : Tests

Testez chaque configuration :

1. **Plateau 4x8 avec 4 BLOKs et 2 BLOKERs**
2. **Plateau 8x8 sans coins avec objectif de 2 captures**
3. **Plateau 6x8 avec 2 coups par tour**
4. **Partie multijoueur avec configuration personnalisée**

---

## 📝 Notes importantes

- Les BLOKs sont toujours placés sur la première ligne (centrés)
- Les BLOKERs sont toujours placés sur la deuxième ligne (centrés)
- Le wrap-around ne fonctionne que verticalement (pas horizontalement)
- Les coins désactivés (8x8-no-corners) ne peuvent pas contenir de pièces
- L'objectif de victoire ne peut pas dépasser le nombre de BLOKs

---

## 🚀 Ordre d'implémentation recommandé

1. ✅ Créer les types et utilitaires (ÉTAPES 1 et 3)
2. ✅ Créer l'interface de configuration (ÉTAPE 2)
3. ✅ Adapter LocalGame pour tester rapidement (ÉTAPE 4)
4. ✅ Adapter GameEngine (ÉTAPE 5)
5. ✅ Adapter BotGame (ÉTAPE 6)
6. ✅ Mettre à jour Supabase (ÉTAPE 8)
7. ✅ Adapter Lobby et MultiplayerGame (ÉTAPES 7 et 9)
8. ✅ Ajouter les styles (ÉTAPE 10)
9. ✅ Intégrer dans App.tsx (ÉTAPE 11)
10. ✅ Tester exhaustivement (ÉTAPE 12)
