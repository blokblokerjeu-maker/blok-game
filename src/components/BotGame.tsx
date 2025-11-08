/**
 * Composant pour jouer contre le bot Q-Learning
 */

import { useState, useEffect, useMemo } from 'react';
import { GameEngine } from '../bot/GameEngine';
import type { Move, PlayerColor } from '../bot/GameEngine';
import { DQNAgentBalanced } from '../bot/DQNAgentBalanced';
import type { GameConfig } from '../types/GameConfig';
import { DEFAULT_CONFIG } from '../types/GameConfig';
import { getColumnLetters } from '../utils/boardSetup';
import '../App.css';

interface BotGameProps {
  onBack?: () => void;
  playerColor: PlayerColor; // Couleur choisie par le joueur humain
  config?: GameConfig; // Configuration du jeu
}

export function BotGame({ onBack, playerColor = 'blanc', config = DEFAULT_CONFIG }: BotGameProps) {
  const [engine, setEngine] = useState<GameEngine>(() => new GameEngine(config));
  const boardInfo = useMemo(() => engine.getBoardInfo(), [engine]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const botColor = playerColor === 'blanc' ? 'noir' : 'blanc';
  const [bot] = useState(() => {
    const agent = new DQNAgentBalanced(botColor, {
      explorationRate: 0.05, // Mode jeu : exploitation maximale
      minExploration: 0.05,
      learningRate: 0.002,
      discountFactor: 0.95,
      explorationDecay: 0.995,
      batchSize: 64,
      targetUpdateFrequency: 100,
      replayBufferSize: 10000
    });
    
    console.log(`🤖 Bot DQN ${botColor} initialisé`);
    console.log(`⚠️ Note: Le bot n'a pas de poids pré-entraînés pour cette session`);
    console.log(`💡 Le bot apprendra au fur et à mesure des parties`);
    
    return agent;
  });

  // Faire jouer le bot quand c'est son tour
  useEffect(() => {
    const currentPlayer = engine.getCurrentPlayer();
    const isGameOver = engine.isGameOver();

    if (!isGameOver && currentPlayer === botColor) {
      setIsThinking(true);
      
      // Délai pour simuler la "réflexion"
      const timeout = setTimeout(() => {
        const move = bot.selectMove(engine);
        if (move) {
          const newEngine = engine.clone();
          newEngine.makeMove(move);
          setEngine(newEngine);
          setLastMove({ from: move.from, to: move.to });
        }
        setIsThinking(false);
      }, 500); // 500ms de délai

      return () => clearTimeout(timeout);
    }
  }, [engine, bot]);

  const handleCellClick = (index: number) => {
    if (isThinking || engine.isGameOver()) return;

    const currentPlayer = engine.getCurrentPlayer();
    
    // Pas le tour du joueur
    if (currentPlayer !== playerColor) return;

    const clickedPiece = engine.getState().pieces[index];

    // CAS 1: Sélectionner une de ses pièces
    if (clickedPiece && clickedPiece.includes(currentPlayer)) {
      setSelectedCell(index);
      const legalMoves = engine.getLegalMoves();
      const movesFromThisCell = legalMoves.filter(m => m.from === index);
      setPossibleMoves(movesFromThisCell);
      return;
    }

    // CAS 2: Exécuter un mouvement
    if (selectedCell !== null) {
      const move = possibleMoves.find(m => m.to === index);
      if (move) {
        const newEngine = engine.clone();
        if (newEngine.makeMove(move)) {
          setEngine(newEngine);
          setLastMove({ from: move.from, to: move.to });
          setSelectedCell(null);
          setPossibleMoves([]);
        }
        return;
      }
    }

    // CAS 3: Désélectionner
    setSelectedCell(null);
    setPossibleMoves([]);
  };

  const renderBoard = () => {
    const cells = [];
    const letters = getColumnLetters(boardInfo);
    const { pieces } = engine.getState();

    for (let i = 0; i < boardInfo.totalCells; i++) {
      // Vérifier si la case est désactivée (coins pour 8x8-no-corners)
      if (boardInfo.disabledCells.includes(i)) {
        cells.push(
          <div key={i} className="board-cell disabled">
            {/* Case désactivée */}
          </div>
        );
        continue;
      }
      
      const isSelected = selectedCell === i;
      const isPossibleMove = possibleMoves.some(m => m.to === i);
      const isLastMoveCell = lastMove && (lastMove.from === i || lastMove.to === i);
      const piece = pieces[i];
      
      // Vérifier si c'est une capture possible
      const isCapturableMove = isPossibleMove && piece !== null && piece.includes('blok');

      const isLeftColumn = i % boardInfo.width === 0;
      const row = Math.floor(i / boardInfo.width);
      const lineNumber = boardInfo.height - row;
      const isBottomRow = row === boardInfo.height - 1;
      const column = i % boardInfo.width;
      const letter = letters[column];

      const getPieceImage = (pieceType: typeof piece) => {
        switch (pieceType) {
          case 'blok-blanc': return '/BLOK BLANC.svg';
          case 'blok-noir': return '/BLOK NOIR.svg';
          case 'bloker-blanc': return '/BLOKER BLANC.svg';
          case 'bloker-noir': return '/BLOKER NOIR.svg';
          default: return null;
        }
      };

      const pieceImage = getPieceImage(piece);
      const isBloker = piece?.includes('bloker');

      // Calculer la couleur de la case (damier)
      const isWhiteCell = (row + column) % 2 === 0;
      const cellColor = isWhiteCell ? '#F2F5FA' : '#5596F2';
      const cellColorClicked = isWhiteCell ? '#9AEBEE' : '#4CBBE9';
      const textColor = isWhiteCell ? '#5596F2' : '#F2F5FA';

      cells.push(
        <div
          key={i}
          className={`board-cell ${isSelected ? 'clicked' : ''} ${isPossibleMove ? 'possible-move' : ''}`}
          onClick={() => handleCellClick(i)}
          style={{
            backgroundColor: (isSelected || isLastMoveCell) ? cellColorClicked : cellColor
          }}
        >
          {isLeftColumn && <span className="line-number" style={{ color: textColor }}>{lineNumber}</span>}
          {piece && pieceImage && (
            <img src={pieceImage} alt="piece" className={`piece ${isBloker ? 'bloker' : ''}`} />
          )}
          {isPossibleMove && !piece && (
            <div className="move-indicator" title="Mouvement possible"></div>
          )}
          {isCapturableMove && (
            <div 
              className="move-indicator"
              style={{
                backgroundColor: 'rgba(255, 59, 48, 0.15)',
                border: '2px solid rgba(255, 59, 48, 0.5)',
                zIndex: 10
              }}
              title="Capture possible"
            ></div>
          )}
          {isBottomRow && <span className="column-letter" style={{ color: textColor }}>{letter}</span>}
        </div>
      );
    }
    return cells;
  };

  const renderCapturedPieces = (type: 'blok' | 'bloker', color: PlayerColor, count: number) => {
    const pieces = [];
    for (let i = 0; i < count; i++) {
      pieces.push(
        <img
          key={`${type}-${color}-${i}`}
          src={`/${type.toUpperCase()} ${color.toUpperCase()}.svg`}
          alt={`${type} ${color}`}
          className={`captured-piece ${type}`}
        />
      );
    }
    return pieces;
  };

  const handleRestart = () => {
    if (window.confirm('Recommencer une nouvelle partie ?')) {
      setEngine(new GameEngine(config));
      setSelectedCell(null);
      setPossibleMoves([]);
    }
  };

  const state = engine.getState();
  const captureStats = engine.getCaptureStats();
  const winner = engine.getWinner();

  return (
    <div className="game-container">
      {onBack && (
        <button className="back-button" onClick={onBack} style={{ position: 'absolute', top: '20px', left: '20px' }}>
          ← Retour
        </button>
      )}

      {/* Indicateur du tour actuel - masqué si 2 coups par tour */}
      {!winner && config.movesPerTurn === 1 && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold',
            color: state.currentPlayer === 'blanc' ? '#5596F2' : '#333',
            marginBottom: '4px'
          }}>
            {state.currentPlayer === botColor ? '🤖 Tour du Bot' : '👤 Votre tour'}
          </div>
        </div>
      )}

      <div className="game-board-wrapper">
        <div className="player-zone player-black">
          <div className="player-header">
            <h2 className={state.currentPlayer === 'noir' && !winner ? 'current-player' : ''}>
              {botColor === 'noir' ? '🤖 Bot NOIR' : 'Joueur NOIR'}
            </h2>
          </div>
          <div className="captured-zone">
            <div className="captured-section">
              <span className="captured-label">BLOK capturés:</span>
              <div className="captured-pieces-row">
                {renderCapturedPieces('blok', 'blanc', captureStats.white)}
              </div>
            </div>
          </div>
        </div>

        <div className="board-container">
          <div 
            className="game-board"
            style={{
              gridTemplateColumns: `repeat(${boardInfo.width}, 1fr)`,
              gridTemplateRows: `repeat(${boardInfo.height}, 1fr)`,
              // @ts-ignore - CSS custom properties
              '--board-width': boardInfo.width,
              '--board-height': boardInfo.height,
              // Recalculer la taille des cases selon la largeur du plateau
              '--available-height': 'calc(100vh - 160px)',
              '--cell-size': `min(calc(100vw / ${boardInfo.width}), calc(var(--available-height) / ${boardInfo.height}))`,
              width: `calc(var(--cell-size) * ${boardInfo.width})`,
              height: `calc(var(--cell-size) * ${boardInfo.height})`
            }}
          >
            {renderBoard()}
          </div>
          {isThinking && (
            <div className="thinking-overlay">
              <div className="thinking-message">🤖 Le bot réfléchit...</div>
            </div>
          )}
        </div>

        <div className="player-zone player-white">
          <div className="player-header">
            <h2 className={state.currentPlayer === 'blanc' && !winner ? 'current-player' : ''}>
              {botColor === 'blanc' ? '🤖 Bot BLANC' : 'Joueur BLANC'}
            </h2>
          </div>
          <div className="captured-zone">
            <div className="captured-section">
              <span className="captured-label">BLOK capturés:</span>
              <div className="captured-pieces-row">
                {renderCapturedPieces('blok', 'noir', captureStats.black)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="game-controls">
        <button onClick={handleRestart} className="surrender-button">
          🔄 Nouvelle partie
        </button>
      </div>

      {winner && (
        <div className="victory-overlay">
          <div className="victory-message">
            <h1>🎉 {winner === playerColor ? 'Victoire !' : 'Défaite...'}</h1>
            <p>{winner.toUpperCase()} a gagné la partie !</p>
            <button onClick={handleRestart} className="play-button">
              Rejouer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
