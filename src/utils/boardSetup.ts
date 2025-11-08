/**
 * Utilitaires pour la configuration et l'initialisation du plateau de jeu
 */

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
    
    if (index !== null && !boardInfo.disabledCells.includes(index)) {
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
 * RÈGLE : Le wrap-around ne fonctionne que verticalement (lignes), pas horizontalement (colonnes)
 */
export function getWrappedIndex(
  row: number, 
  col: number, 
  boardInfo: BoardInfo
): number | null {
  // Wrap-around vertical seulement
  const wrappedRow = ((row % boardInfo.height) + boardInfo.height) % boardInfo.height;
  
  // Les colonnes ne wrappent pas - elles doivent rester dans les limites
  if (col < 0 || col >= boardInfo.width) return null;
  
  const index = boardInfo.getIndex(wrappedRow, col);
  
  // Vérifier si la case n'est pas désactivée (coins)
  if (index !== null && boardInfo.disabledCells.includes(index)) return null;
  
  return index;
}

/**
 * Calcule la distance entre deux positions sur le plateau
 */
export function getDistance(
  index1: number, 
  index2: number, 
  boardInfo: BoardInfo
): number {
  const pos1 = boardInfo.getRowCol(index1);
  const pos2 = boardInfo.getRowCol(index2);
  
  if (!pos1 || !pos2) return Infinity;
  
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  
  return Math.max(rowDiff, colDiff); // Distance de Chebyshev
}

/**
 * Retourne toutes les cases du plateau (excluant les cases désactivées)
 */
export function getAllValidCells(boardInfo: BoardInfo): number[] {
  const cells: number[] = [];
  
  for (let i = 0; i < boardInfo.totalCells; i++) {
    if (!boardInfo.disabledCells.includes(i)) {
      cells.push(i);
    }
  }
  
  return cells;
}

/**
 * Compte le nombre de pièces d'un certain type sur le plateau
 */
export function countPieces(
  board: Record<number, PieceType>,
  pieceType: string // 'blok', 'bloker', 'blanc', 'noir'
): number {
  let count = 0;
  
  for (const index in board) {
    const piece = board[index];
    if (piece && piece.includes(pieceType)) {
      count++;
    }
  }
  
  return count;
}

/**
 * Retourne les lettres de colonnes selon la largeur du plateau
 */
export function getColumnLetters(boardInfo: BoardInfo): string[] {
  const allLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return allLetters.slice(0, boardInfo.width);
}

/**
 * Convertit une position en notation d'échecs (ex: a1, h8)
 */
export function indexToNotation(index: number, boardInfo: BoardInfo): string | null {
  const pos = boardInfo.getRowCol(index);
  if (!pos) return null;
  
  const letters = getColumnLetters(boardInfo);
  const letter = letters[pos.col];
  const number = boardInfo.height - pos.row; // Inverser pour avoir 1 en bas
  
  return `${letter}${number}`;
}

/**
 * Convertit une notation d'échecs en index (ex: a1 -> index)
 */
export function notationToIndex(notation: string, boardInfo: BoardInfo): number | null {
  if (notation.length < 2) return null;
  
  const letter = notation[0].toLowerCase();
  const number = parseInt(notation.slice(1));
  
  const letters = getColumnLetters(boardInfo);
  const col = letters.indexOf(letter);
  if (col === -1) return null;
  
  const row = boardInfo.height - number; // Inverser pour avoir 1 en bas
  
  return boardInfo.getIndex(row, col);
}
