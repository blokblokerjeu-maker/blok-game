/**
 * Configuration modulable du jeu BLOK
 * Permet de personnaliser les règles et le plateau de jeu
 */

/**
 * Types de plateaux disponibles
 */
export type BoardType = 
  | '8x8'              // 64 cases standard
  | '6x8'              // 48 cases
  | '4x8'              // 32 cases
  | '8x8-no-corners';  // 60 cases (sans les 4 coins)

/**
 * Configuration complète d'une partie
 */
export interface GameConfig {
  /** Nombre de BLOKs par joueur (sur la première ligne) */
  blokCount: number; // 4, 6, ou 8
  
  /** Nombre de BLOKERs par joueur (sur la deuxième ligne) */
  blokerCount: number; // 2, 3, ou 4
  
  /** Nombre de coups par tour */
  movesPerTurn: 1 | 2;
  
  /** Type de plateau */
  boardType: BoardType;
  
  /** Nombre de BLOKs adverses à capturer pour gagner */
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
  /** Largeur du plateau (nombre de colonnes) */
  width: number;
  
  /** Hauteur du plateau (nombre de lignes) */
  height: number;
  
  /** Nombre total de cases */
  totalCells: number;
  
  /** Cases désactivées (pour 8x8-no-corners) */
  disabledCells: number[];
  
  /** Convertit row/col en index */
  getIndex: (row: number, col: number) => number | null;
  
  /** Convertit index en row/col */
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
      // Coins désactivés : a8 (0), h8 (7), a1 (56), h1 (63)
      return {
        width: 8,
        height: 8,
        totalCells: 64, // Total de cases (dont 4 désactivées)
        disabledCells: [0, 7, 56, 63], // a8, h8, a1, h1
        getIndex: (row, col) => {
          if (row < 0 || row >= 8 || col < 0 || col >= 8) return null;
          const index = row * 8 + col;
          // Ne pas retourner null pour les coins, juste les marquer comme désactivés
          return index;
        },
        getRowCol: (index) => {
          if (index < 0 || index >= 64) return null;
          // Ne pas retourner null pour les coins, juste les marquer comme désactivés
          return { row: Math.floor(index / 8), col: index % 8 };
        }
      };
  }
}

/**
 * Valide une configuration de jeu
 */
export function validateGameConfig(config: GameConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Valider blokCount
  if (![4, 6, 8].includes(config.blokCount)) {
    errors.push('Le nombre de BLOKs doit être 4, 6 ou 8');
  }
  
  // Valider blokerCount
  if (![2, 3, 4].includes(config.blokerCount)) {
    errors.push('Le nombre de BLOKERs doit être 2, 3 ou 4');
  }
  
  // Valider movesPerTurn
  if (![1, 2].includes(config.movesPerTurn)) {
    errors.push('Le nombre de coups par tour doit être 1 ou 2');
  }
  
  // Valider captureGoal
  if (config.captureGoal < 1 || config.captureGoal > config.blokCount) {
    errors.push(`L'objectif de capture doit être entre 1 et ${config.blokCount}`);
  }
  
  // Valider que les pièces rentrent sur le plateau
  const boardInfo = getBoardInfo(config.boardType);
  if (config.blokCount > boardInfo.width) {
    errors.push(`Impossible de placer ${config.blokCount} BLOKs sur un plateau de largeur ${boardInfo.width}`);
  }
  if (config.blokerCount > boardInfo.width) {
    errors.push(`Impossible de placer ${config.blokerCount} BLOKERs sur un plateau de largeur ${boardInfo.width}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
