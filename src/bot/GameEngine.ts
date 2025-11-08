/**
 * Moteur de jeu BLOK simplifié pour simulations rapides
 * Utilisé par l'agent Q-learning pour l'entraînement
 */

import type { GameConfig, BoardInfo } from '../types/GameConfig';
import { DEFAULT_CONFIG, getBoardInfo } from '../types/GameConfig';
import { generateInitialBoard, getWrappedIndex as utilGetWrappedIndex } from '../utils/boardSetup';
import type { PieceType } from '../utils/boardSetup';

export type { PieceType };
export type PlayerColor = 'blanc' | 'noir';

export interface Move {
  from: number;
  to: number;
  captured?: boolean;
}

export interface GameState {
  pieces: Record<number, PieceType>;
  currentPlayer: PlayerColor;
  movesInTurn: number;
  firstMovePieceIndex: number | null;
  capturedBloksWhite: number;
  capturedBloksBlack: number;
  lastTurnPlayer: PlayerColor | null;
  winner: PlayerColor | null;
  moveHistory: Move[];
}

export class GameEngine {
  private state: GameState;
  private config: GameConfig;
  private boardInfo: BoardInfo;

  constructor(config: GameConfig = DEFAULT_CONFIG, initialState?: GameState) {
    this.config = config;
    this.boardInfo = getBoardInfo(config.boardType);
    
    if (initialState) {
      this.state = { ...initialState };
    } else {
      this.state = this.getInitialState();
    }
  }

  /**
   * Retourne l'état initial du jeu selon la configuration
   */
  private getInitialState(): GameState {
    return {
      pieces: generateInitialBoard(this.config),
      currentPlayer: 'blanc',
      movesInTurn: 0,
      firstMovePieceIndex: null,
      capturedBloksWhite: 0,
      capturedBloksBlack: 0,
      lastTurnPlayer: null,
      winner: null,
      moveHistory: []
    };
  }

  /**
   * Retourne une copie de l'état actuel
   */
  getState(): GameState {
    return {
      ...this.state,
      pieces: { ...this.state.pieces },
      moveHistory: [...this.state.moveHistory]
    };
  }

  /**
   * Clone le moteur avec son état actuel
   */
  clone(): GameEngine {
    return new GameEngine(this.config, this.getState());
  }

  /**
   * Retourne la configuration du jeu
   */
  getConfig(): GameConfig {
    return { ...this.config };
  }

  /**
   * Retourne les informations du plateau
   */
  getBoardInfo(): BoardInfo {
    return this.boardInfo;
  }

  /**
   * Vérifie si la partie est terminée
   */
  isGameOver(): boolean {
    return this.state.winner !== null;
  }

  /**
   * Retourne le gagnant (ou null si partie en cours)
   */
  getWinner(): PlayerColor | null {
    return this.state.winner;
  }

  /**
   * Calcule tous les mouvements légaux pour le joueur actuel
   */
  getLegalMoves(): Move[] {
    if (this.isGameOver()) return [];

    const moves: Move[] = [];
    const { pieces, currentPlayer, movesInTurn, firstMovePieceIndex } = this.state;

    // Parcourir toutes les cases pour trouver les pièces du joueur actuel
    for (let i = 0; i < this.boardInfo.totalCells; i++) {
      const piece = pieces[i];
      if (!piece || !piece.includes(currentPlayer)) continue;

      // En mode 2 coups par tour, empêcher de jouer la même pièce deux fois
      if (this.config.movesPerTurn === 2 && movesInTurn === 1 && firstMovePieceIndex === i) {
        continue; // Ignorer cette pièce
      }

      const pieceMoves = piece.includes('bloker')
        ? this.getBlockerMoves(i)
        : this.getBlokMoves(i);

      moves.push(...pieceMoves);
    }

    return moves;
  }

  /**
   * Calcule les mouvements possibles pour un BLOKER
   * RÈGLE : Les BLOKER peuvent se téléporter UNIQUEMENT sur des cases vides
   * Les BLOKER NE PEUVENT PAS capturer (ni BLOK ni BLOKER)
   */
  private getBlockerMoves(index: number): Move[] {
    const moves: Move[] = [];
    const { pieces } = this.state;
    const currentPiece = pieces[index];
    if (!currentPiece) return moves;

    // Parcourir TOUTES les cases du plateau (téléportation)
    for (let targetIndex = 0; targetIndex < this.boardInfo.totalCells; targetIndex++) {
      // Ne pas se téléporter sur soi-même
      if (targetIndex === index) continue;

      // Ignorer les cases désactivées (coins)
      if (this.boardInfo.disabledCells.includes(targetIndex)) continue;

      const targetPiece = pieces[targetIndex];

      // BLOKER peut se téléporter UNIQUEMENT sur des cases vides
      // Les BLOKER ne peuvent PAS capturer (ni BLOK ni BLOKER)
      if (targetPiece === null) {
        moves.push({ from: index, to: targetIndex });
      }
    }

    return moves;
  }

  /**
   * Calcule les mouvements possibles pour un BLOK
   */
  private getBlokMoves(index: number): Move[] {
    const moves: Move[] = [];
    const { pieces } = this.state;
    const row = Math.floor(index / this.boardInfo.width);
    const col = index % this.boardInfo.width;
    const currentPiece = pieces[index];
    if (!currentPiece) return moves;

    const currentColor = currentPiece.includes('blanc') ? 'blanc' : 'noir';
    const opponentColor = currentColor === 'blanc' ? 'noir' : 'blanc';
    const direction = currentColor === 'blanc' ? -1 : 1; // blanc va vers le haut (-1), noir vers le bas (+1)

    // Fonction helper pour vérifier si on peut se déplacer vers une case
    const canMoveTo = (targetIndex: number): boolean => {
      const targetPiece = pieces[targetIndex];
      if (targetPiece === null) return true;
      if (targetPiece.includes('bloker')) return false;
      return targetPiece.includes('blok') && targetPiece.includes(opponentColor);
    };

    // Fonction helper pour obtenir l'index avec wrap-around
    const getWrappedIndex = (targetRow: number, targetCol: number): number | null => {
      return utilGetWrappedIndex(targetRow, targetCol, this.boardInfo);
    };

    // Vérifier si un mouvement est bloqué par un BLOKER adverse
    const isBlockedByOpponentBlocker = (path: number[]): boolean => {
      return path.some(idx =>
        pieces[idx]?.includes('bloker') && pieces[idx]?.includes(opponentColor)
      );
    };

    // Vérifier si le chemin contient une pièce adverse (BLOKER ou BLOK)
    // Les BLOK NE PEUVENT PAS sauter par-dessus des pièces adverses
    const hasOpponentPieceInPath = (path: number[]): boolean => {
      return path.some(idx => {
        const piece = pieces[idx];
        return piece !== null && piece.includes(opponentColor);
      });
    };

    // Peut sauter par-dessus ses propres pièces UNIQUEMENT
    const canJumpOver = (idx: number): boolean => {
      const piece = pieces[idx];
      return piece !== null && piece.includes(currentColor);
    };

    // Mouvements avant (1, 2, 3 cases)
    for (let distance = 1; distance <= 3; distance++) {
      const targetRow = row + direction * distance;
      const targetIndex = getWrappedIndex(targetRow, col);
      if (targetIndex === null) continue;

      // Vérifier le chemin
      const path: number[] = [];
      for (let d = 1; d < distance; d++) {
        const intermediateRow = row + direction * d;
        const intermediateIndex = getWrappedIndex(intermediateRow, col);
        if (intermediateIndex !== null) path.push(intermediateIndex);
      }

      // Vérifier les conditions :
      // 1. Le chemin doit être vide OU contenir uniquement des pièces alliées (saut autorisé)
      // 2. PAS de pièces adverses dans le chemin (interdit de sauter par-dessus)
      // 3. PAS de BLOKER adverse dans le chemin (bloque les mouvements de 2-3 cases)
      // 4. La case d'arrivée doit être valide
      const allClearOrJumpable = path.every(idx => pieces[idx] === null || canJumpOver(idx));
      const noOpponentInPath = !hasOpponentPieceInPath(path);
      
      if (allClearOrJumpable && noOpponentInPath && !isBlockedByOpponentBlocker(path) && canMoveTo(targetIndex)) {
        const captured = pieces[targetIndex]?.includes('blok') ?? false;
        moves.push({ from: index, to: targetIndex, captured });
      }
    }

    // Mouvements diagonaux (gauche et droite, 1, 2, 3 cases)
    for (const colDirection of [-1, 1]) {
      for (let distance = 1; distance <= 3; distance++) {
        const targetRow = row + direction * distance;
        const targetCol = col + colDirection * distance;
        const targetIndex = getWrappedIndex(targetRow, targetCol);
        if (targetIndex === null) continue;

        // Vérifier le chemin
        const path: number[] = [];
        for (let d = 1; d < distance; d++) {
          const intermediateRow = row + direction * d;
          const intermediateCol = col + colDirection * d;
          const intermediateIndex = getWrappedIndex(intermediateRow, intermediateCol);
          if (intermediateIndex !== null) path.push(intermediateIndex);
        }

        // Vérifier les conditions :
        // 1. Le chemin doit être vide OU contenir uniquement des pièces alliées (saut autorisé)
        // 2. PAS de pièces adverses dans le chemin (interdit de sauter par-dessus)
        // 3. PAS de BLOKER adverse dans le chemin (bloque les mouvements de 2-3 cases)
        // 4. La case d'arrivée doit être valide
        const allClearOrJumpable = path.every(idx => pieces[idx] === null || canJumpOver(idx));
        const noOpponentInPath = !hasOpponentPieceInPath(path);
        
        if (allClearOrJumpable && noOpponentInPath && !isBlockedByOpponentBlocker(path) && canMoveTo(targetIndex)) {
          const captured = pieces[targetIndex]?.includes('blok') ?? false;
          moves.push({ from: index, to: targetIndex, captured });
        }
      }
    }

    return moves;
  }

  /**
   * Applique un mouvement et met à jour l'état
   */
  makeMove(move: Move): boolean {
    if (this.isGameOver()) return false;

    const { from, to } = move;
    const { pieces, currentPlayer } = this.state;

    // Vérifier que le mouvement est légal
    const legalMoves = this.getLegalMoves();
    const isLegal = legalMoves.some(m => m.from === from && m.to === to);
    if (!isLegal) return false;

    // Effectuer le mouvement
    const movingPiece = pieces[from];
    const targetPiece = pieces[to];
    const captured = targetPiece?.includes('blok') ?? false;

    const newPieces = { ...pieces };
    newPieces[to] = movingPiece;
    newPieces[from] = null;

    this.state.pieces = newPieces;
    this.state.moveHistory.push({ from, to, captured });

    // Mettre à jour les captures
    let newCapturedWhite = this.state.capturedBloksWhite;
    let newCapturedBlack = this.state.capturedBloksBlack;

    if (captured) {
      if (currentPlayer === 'blanc' && targetPiece?.includes('noir')) {
        newCapturedBlack++;
        this.state.capturedBloksBlack = newCapturedBlack;
      } else if (currentPlayer === 'noir' && targetPiece?.includes('blanc')) {
        newCapturedWhite++;
        this.state.capturedBloksWhite = newCapturedWhite;
      }
    }

    // Vérifier les conditions de victoire
    this.checkWinConditions(currentPlayer, newCapturedWhite, newCapturedBlack);

    // Gérer les mouvements multiples par tour
    if (!this.isGameOver()) {
      const newMovesInTurn = this.state.movesInTurn + 1;
      if (newMovesInTurn >= this.config.movesPerTurn) {
        // Tour complet, passer au joueur suivant
        this.state.currentPlayer = currentPlayer === 'blanc' ? 'noir' : 'blanc';
        this.state.movesInTurn = 0;
        this.state.firstMovePieceIndex = null; // Réinitialiser pour le nouveau tour
      } else {
        // Encore des mouvements à jouer dans ce tour
        this.state.movesInTurn = newMovesInTurn;
        // Enregistrer la pièce jouée au premier coup (départ du mouvement)
        if (this.state.movesInTurn === 0) {
          this.state.firstMovePieceIndex = from;
        }
      }
    }

    return true;
  }

  /**
   * Vérifie les conditions de victoire après un mouvement
   */
  private checkWinConditions(
    currentPlayer: PlayerColor,
    capturedWhite: number,
    capturedBlack: number
  ): void {
    const opponentPlayer = currentPlayer === 'blanc' ? 'noir' : 'blanc';
    const captureGoal = this.config.captureGoal;

    // Si on est dans un dernier tour
    if (this.state.lastTurnPlayer === currentPlayer) {
      if (capturedWhite >= captureGoal && capturedWhite > capturedBlack) {
        this.state.winner = 'noir';
      } else if (capturedBlack >= captureGoal && capturedBlack > capturedWhite) {
        this.state.winner = 'blanc';
      } else {
        // Égalisation, la partie continue
        this.state.lastTurnPlayer = null;
      }
      return;
    }

    // Vérifier si quelqu'un atteint l'objectif avec écart
    if ((capturedWhite >= captureGoal || capturedBlack >= captureGoal) && capturedWhite !== capturedBlack) {
      this.state.lastTurnPlayer = opponentPlayer;
    }
  }

  /**
   * Retourne une représentation simple de l'état pour le Q-learning
   */
  getStateVector(): number[] {
    const vector: number[] = [];
    const { pieces, currentPlayer, capturedBloksWhite, capturedBloksBlack } = this.state;

    // Ajouter les positions des pièces (simplified)
    for (let i = 0; i < this.boardInfo.totalCells; i++) {
      const piece = pieces[i];
      if (piece === null) {
        vector.push(0);
      } else if (piece === 'blok-blanc') {
        vector.push(1);
      } else if (piece === 'blok-noir') {
        vector.push(-1);
      } else if (piece === 'bloker-blanc') {
        vector.push(2);
      } else if (piece === 'bloker-noir') {
        vector.push(-2);
      }
    }

    // Ajouter le joueur actuel
    vector.push(currentPlayer === 'blanc' ? 1 : -1);

    // Ajouter les captures
    vector.push(capturedBloksWhite);
    vector.push(capturedBloksBlack);

    // Ajouter l'état de dernier tour
    vector.push(this.state.lastTurnPlayer === 'blanc' ? 1 : this.state.lastTurnPlayer === 'noir' ? -1 : 0);

    return vector;
  }

  /**
   * Retourne le joueur actuel
   */
  getCurrentPlayer(): PlayerColor {
    return this.state.currentPlayer;
  }

  /**
   * Retourne les statistiques de captures
   */
  getCaptureStats(): { white: number; black: number } {
    return {
      white: this.state.capturedBloksWhite,
      black: this.state.capturedBloksBlack
    };
  }
}
