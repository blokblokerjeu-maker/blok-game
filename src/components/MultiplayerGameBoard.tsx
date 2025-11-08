// Ce fichier contient toute la logique de jeu adaptée pour le multijoueur
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Game } from '../lib/supabase'
import type { PieceType } from '../utils/boardSetup'
import '../App.css'
import '../styles/board.css'
import '../styles/pieces.css'
import '../styles/ui.css'

type PlayerColor = 'blanc' | 'noir'

type MultiplayerGameBoardProps = {
  gameId: string
  myColor: PlayerColor
  onLeave: () => void
}

export function MultiplayerGameBoard({ gameId, myColor, onLeave }: MultiplayerGameBoardProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [pieces, setPieces] = useState<Record<number, PieceType>>({})
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  // Synchroniser les pieces quand game change
  useEffect(() => {
    if (game?.board_state) {
      const newPieces = JSON.parse(game.board_state) as Record<number, PieceType>
      setPieces(newPieces)
      console.log('🔄 Plateau mis à jour en temps réel!', 'Tour:', game.current_turn)
      
      // Réinitialiser la sélection si ce n'est plus notre tour
      if (game.current_turn !== myColor) {
        setSelectedCell(null)
        setPossibleMoves([])
      }
    }
  }, [game, myColor])

  useEffect(() => {
    loadGame()

    // S'abonner aux changements en temps réel
    const subscription = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('📡 Changement reçu de Supabase Realtime:', payload.new)
          setGame(payload.new as Game)
        }
      )
      .subscribe((status) => {
        console.log('🔌 Statut Realtime:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connecté en temps réel à la partie', gameId)
        }
      })

    // BACKUP: Polling toutes les 2 secondes si Realtime ne fonctionne pas
    // Décommenter cette section si Realtime ne fonctionne pas après configuration
    /*
    const pollingInterval = setInterval(() => {
      console.log('🔄 Polling: Rafraîchissement manuel du jeu...')
      loadGame()
    }, 2000)
    */

    return () => {
      subscription.unsubscribe()
      // clearInterval(pollingInterval) // Décommenter si polling activé
    }
  }, [gameId])

  const loadGame = async () => {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        player_white:profiles!games_player_white_id_fkey(*),
        player_black:profiles!games_player_black_id_fkey(*)
      `)
      .eq('id', gameId)
      .single()

    if (error) {
      console.error('Error loading game:', error)
      return
    }

    setGame(data)
    setLoading(false)
  }

  const updateGameState = async (updates: Partial<Game>) => {
    const { error } = await supabase
      .from('games')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)

    if (error) {
      console.error('Error updating game:', error)
    }
  }

  const handleSurrender = async () => {
    if (!window.confirm('Voulez-vous vraiment abandonner la partie ?')) {
      return
    }

    // L'adversaire gagne
    const opponentColor = myColor === 'blanc' ? 'noir' : 'blanc'
    
    await updateGameState({
      winner: opponentColor,
      status: 'finished'
    })

    console.log('🏳️ Abandon de la partie')
  }

  if (loading || !game) {
    return (
      <div className="loading-screen">
        <h1 className="game-title">BLOK</h1>
        <p>Chargement de la partie...</p>
      </div>
    )
  }

  const isMyTurn = game.current_turn === myColor

  // === COPIE EXACTE DES FONCTIONS DE LocalGame.tsx ===

  const calculateBlokMoves = (index: number, currentPieces: Record<number, PieceType>): Set<number> => {
    const moves = new Set<number>()
    const row = Math.floor(index / 8)
    const col = index % 8
    const currentColor = currentPieces[index]?.includes('blanc') ? 'blanc' : 'noir'
    const opponentColor = currentColor === 'blanc' ? 'noir' : 'blanc'
    
    const getWrappedIndex = (targetRow: number, targetCol: number): number | null => {
      const wrappedRow = ((targetRow % 8) + 8) % 8
      if (targetCol < 0 || targetCol > 7) return null
      return wrappedRow * 8 + targetCol
    }
    
    const canMoveTo = (targetIndex: number): boolean => {
      const targetPiece = currentPieces[targetIndex]
      if (targetPiece === null) return true
      if (targetPiece.includes('bloker')) return false
      if (targetPiece.includes('blok') && targetPiece.includes(opponentColor)) return true
      return false
    }
    
    const isBlockedByOpponentBlocker = (startIndex: number, targetIndex: number): boolean => {
      const intermediateIndices: number[] = []
      const diff = targetIndex - startIndex
      
      if (diff === -16) intermediateIndices.push(startIndex - 8)
      else if (diff === +16) intermediateIndices.push(startIndex + 8)
      else if (diff === -24) intermediateIndices.push(startIndex - 8, startIndex - 16)
      else if (diff === +24) intermediateIndices.push(startIndex + 8, startIndex + 16)
      else if (diff === -18) intermediateIndices.push(startIndex - 9)
      else if (diff === -14) intermediateIndices.push(startIndex - 7)
      else if (diff === +14) intermediateIndices.push(startIndex + 7)
      else if (diff === +18) intermediateIndices.push(startIndex + 9)
      else if (diff === -27) intermediateIndices.push(startIndex - 9, startIndex - 18)
      else if (diff === -21) intermediateIndices.push(startIndex - 7, startIndex - 14)
      else if (diff === +21) intermediateIndices.push(startIndex + 7, startIndex + 14)
      else if (diff === +27) intermediateIndices.push(startIndex + 9, startIndex + 18)
      
      if (intermediateIndices.length === 0) return false
      return intermediateIndices.some(idx => 
        currentPieces[idx]?.includes('bloker') && currentPieces[idx]?.includes(opponentColor)
      )
    }
    
    const canJumpOver = (intermediateIndex: number): boolean => {
      const piece = currentPieces[intermediateIndex]
      return piece !== null && piece.includes(currentColor)
    }

    // Direction basée sur la couleur
    const direction = currentColor === 'blanc' ? -1 : 1

    // Mouvements de 1 case
    const forwardIndex = getWrappedIndex(row + direction, col)
    const diagLeftIndex = getWrappedIndex(row + direction, col - 1)
    const diagRightIndex = getWrappedIndex(row + direction, col + 1)

    if (forwardIndex !== null && canMoveTo(forwardIndex)) moves.add(forwardIndex)
    if (diagLeftIndex !== null && canMoveTo(diagLeftIndex)) moves.add(diagLeftIndex)
    if (diagRightIndex !== null && canMoveTo(diagRightIndex)) moves.add(diagRightIndex)

    // Mouvements de 2 cases
    const forward2Index = getWrappedIndex(row + 2 * direction, col)
    const diagLeft2Index = getWrappedIndex(row + 2 * direction, col - 2)
    const diagRight2Index = getWrappedIndex(row + 2 * direction, col + 2)
    const intermediate1Forward2 = getWrappedIndex(row + direction, col)
    const intermediate1DiagLeft2 = getWrappedIndex(row + direction, col - 1)
    const intermediate1DiagRight2 = getWrappedIndex(row + direction, col + 1)

    if (intermediate1Forward2 !== null && forward2Index !== null &&
        (canJumpOver(intermediate1Forward2) || currentPieces[intermediate1Forward2] === null) &&
        !isBlockedByOpponentBlocker(index, forward2Index) &&
        canMoveTo(forward2Index)) moves.add(forward2Index)

    if (intermediate1DiagLeft2 !== null && diagLeft2Index !== null &&
        (canJumpOver(intermediate1DiagLeft2) || currentPieces[intermediate1DiagLeft2] === null) &&
        !isBlockedByOpponentBlocker(index, diagLeft2Index) &&
        canMoveTo(diagLeft2Index)) moves.add(diagLeft2Index)

    if (intermediate1DiagRight2 !== null && diagRight2Index !== null &&
        (canJumpOver(intermediate1DiagRight2) || currentPieces[intermediate1DiagRight2] === null) &&
        !isBlockedByOpponentBlocker(index, diagRight2Index) &&
        canMoveTo(diagRight2Index)) moves.add(diagRight2Index)

    // Mouvements de 3 cases
    const forward3Index = getWrappedIndex(row + 3 * direction, col)
    const diagLeft3Index = getWrappedIndex(row + 3 * direction, col - 3)
    const diagRight3Index = getWrappedIndex(row + 3 * direction, col + 3)
    const intermediate2Forward3 = getWrappedIndex(row + 2 * direction, col)
    const intermediate2DiagLeft3 = getWrappedIndex(row + 2 * direction, col - 2)
    const intermediate2DiagRight3 = getWrappedIndex(row + 2 * direction, col + 2)

    if (intermediate1Forward2 !== null && intermediate2Forward3 !== null && forward3Index !== null &&
        (canJumpOver(intermediate1Forward2) || currentPieces[intermediate1Forward2] === null) &&
        (canJumpOver(intermediate2Forward3) || currentPieces[intermediate2Forward3] === null) &&
        !isBlockedByOpponentBlocker(index, forward3Index) &&
        canMoveTo(forward3Index)) moves.add(forward3Index)

    if (intermediate1DiagLeft2 !== null && intermediate2DiagLeft3 !== null && diagLeft3Index !== null &&
        (canJumpOver(intermediate1DiagLeft2) || currentPieces[intermediate1DiagLeft2] === null) &&
        (canJumpOver(intermediate2DiagLeft3) || currentPieces[intermediate2DiagLeft3] === null) &&
        !isBlockedByOpponentBlocker(index, diagLeft3Index) &&
        canMoveTo(diagLeft3Index)) moves.add(diagLeft3Index)

    if (intermediate1DiagRight2 !== null && intermediate2DiagRight3 !== null && diagRight3Index !== null &&
        (canJumpOver(intermediate1DiagRight2) || currentPieces[intermediate1DiagRight2] === null) &&
        (canJumpOver(intermediate2DiagRight3) || currentPieces[intermediate2DiagRight3] === null) &&
        !isBlockedByOpponentBlocker(index, diagRight3Index) &&
        canMoveTo(diagRight3Index)) moves.add(diagRight3Index)

    return moves
  }

  // Fonction pour gérer le clic sur une case
  const handleCellClick = async (index: number) => {
    if (!isMyTurn) return // Empêcher de jouer si ce n'est pas mon tour

    const piece = pieces[index]
    const currentPlayer = game.current_turn
    
    // CAS 1: Si on clique sur une pièce du joueur actuel
    if (piece && ((currentPlayer === 'blanc' && piece.includes('blanc')) || (currentPlayer === 'noir' && piece.includes('noir')))) {
      if (selectedCell === index) {
        setSelectedCell(null)
        setPossibleMoves([])
        return
      }
      
      setSelectedCell(index)
      
      // IMPORTANT : Vérifier 'bloker' AVANT 'blok' car 'bloker' contient 'blok'
      if (piece.includes('bloker')) {
        // Les BLOKER peuvent se téléporter sur n'importe quelle case vide du plateau
        const moves = []
        for (let i = 0; i < 64; i++) {
          if (pieces[i] === null) {
            moves.push(i)
          }
        }
        setPossibleMoves(moves)
        console.log('BLOKER sélectionné, mouvements possibles:', moves.length)
      } else if (piece.includes('blok')) {
        const moves = calculateBlokMoves(index, pieces)
        setPossibleMoves(Array.from(moves))
        console.log('BLOK sélectionné, mouvements possibles:', moves.size)
      }
    }
    // CAS 2: Si une pièce est sélectionnée et qu'on clique sur un mouvement possible
    else if (selectedCell !== null && possibleMoves.includes(index)) {
      const selectedPiece = pieces[selectedCell]
      const targetPiece = pieces[index]
      const isCapture = targetPiece !== null && targetPiece.includes('blok') &&
                       ((selectedPiece?.includes('blanc') && targetPiece?.includes('noir')) ||
                        (selectedPiece?.includes('noir') && targetPiece?.includes('blanc')))
      
      // Mise à jour du plateau
      const newPieces = { ...pieces }
      newPieces[index] = selectedPiece
      newPieces[selectedCell] = null
      
      // Réinitialiser la sélection
      setSelectedCell(null)
      setPossibleMoves([])
      
      // Calculer les nouveaux compteurs
      let newCapturedWhite = game.captured_bloks_white
      let newCapturedBlack = game.captured_bloks_black
      
      if (isCapture) {
        if (currentPlayer === 'blanc' && targetPiece?.includes('noir')) {
          newCapturedBlack++
        } else if (currentPlayer === 'noir' && targetPiece?.includes('blanc')) {
          newCapturedWhite++
        }
      }
      
      const opponentPlayer = currentPlayer === 'blanc' ? 'noir' : 'blanc'
      let newLastTurnPlayer = game.last_turn_player
      let newWinner = game.winner
      
      if (isCapture) {
        // Logique de victoire
        if (game.last_turn_player === currentPlayer) {
          if (newCapturedWhite >= 4 && newCapturedWhite > newCapturedBlack) {
            newWinner = 'noir'
          } else if (newCapturedBlack >= 4 && newCapturedBlack > newCapturedWhite) {
            newWinner = 'blanc'
          } else {
            newLastTurnPlayer = null
          }
        }
        
        if (!newWinner && (newCapturedWhite >= 4 || newCapturedBlack >= 4) && newCapturedWhite !== newCapturedBlack) {
          newLastTurnPlayer = opponentPlayer
        }
      } else {
        if (game.last_turn_player === currentPlayer) {
          if (newCapturedWhite >= 4 && newCapturedWhite > newCapturedBlack) {
            newWinner = 'noir'
          } else if (newCapturedBlack >= 4 && newCapturedBlack > newCapturedWhite) {
            newWinner = 'blanc'
          } else {
            newLastTurnPlayer = null
          }
        }
      }
      
      // Mettre à jour le jeu dans Supabase
      await updateGameState({
        board_state: JSON.stringify(newPieces),
        current_turn: newWinner ? currentPlayer : opponentPlayer,
        captured_bloks_white: newCapturedWhite,
        captured_bloks_black: newCapturedBlack,
        last_turn_player: newLastTurnPlayer,
        winner: newWinner,
        status: newWinner ? 'finished' : 'active'
      })
    }
    // CAS 3: Clic ailleurs, désélectionner
    else {
      setSelectedCell(null)
      setPossibleMoves([])
    }
  }

  // Rendu du plateau
  const renderBoard = () => {
    const cells = []
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    
    // Pour le joueur noir, on inverse le plateau (rotation 180°)
    const renderOrder = myColor === 'noir' 
      ? Array.from({ length: 64 }, (_, i) => 63 - i) // Inverser : 63, 62, 61, ..., 0
      : Array.from({ length: 64 }, (_, i) => i)       // Normal : 0, 1, 2, ..., 63
    
    for (const i of renderOrder) {
      const isSelected = selectedCell === i
      const isPossibleMove = possibleMoves.includes(i)
      const piece = pieces[i]
      
      // Calculer la position visuelle basée sur l'ordre de rendu
      const visualIndex = renderOrder.indexOf(i)
      const isLeftColumn = visualIndex % 8 === 0
      const visualRow = Math.floor(visualIndex / 8)
      const isBottomRow = visualRow === 7
      
      // Pour le joueur noir, inverser aussi les numéros de ligne et lettres
      const row = Math.floor(i / 8)
      const col = i % 8
      const lineNumber = myColor === 'noir' ? row + 1 : 8 - row
      const letter = myColor === 'noir' ? letters[7 - col] : letters[col]
      
      const getPieceImage = (piece: PieceType): string | null => {
        switch (piece) {
          case 'blok-blanc': return '/BLOK BLANC.svg'
          case 'blok-noir': return '/BLOK NOIR.svg'
          case 'bloker-blanc': return '/BLOKER BLANC.svg'
          case 'bloker-noir': return '/BLOKER NOIR.svg'
          default: return null
        }
      }
      
      const pieceImage = getPieceImage(piece)
      const isBloker = piece && piece.includes('bloker')
      
      cells.push(
        <div 
          key={`cell-${visualIndex}`}
          data-real-index={i}
          className={`board-cell ${isSelected ? 'clicked' : ''} ${isPossibleMove ? 'possible-move' : ''}`}
          onClick={() => {
            console.log('Clic sur case réelle:', i, 'visuelle:', visualIndex, 'piece:', piece)
            handleCellClick(i)
          }}
        >
          {isLeftColumn && <span className="line-number">{lineNumber}</span>}
          {piece && pieceImage && (
            <img src={pieceImage} alt="piece" className={`piece ${isBloker ? 'bloker' : ''}`} />
          )}
          {isPossibleMove && pieces[i] === null && (
            <div className="move-indicator" title="Mouvement possible"></div>
          )}
          {isBottomRow && <span className="column-letter">{letter}</span>}
        </div>
      )
    }
    return cells
  }

  return (
    <div className="game-container">
      {/* Bouton retour simple */}
      <button 
        onClick={onLeave}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          borderRadius: '8px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}
        aria-label="Retour au lobby"
      >
        ←
      </button>

      {/* Bouton d'abandon */}
      {!game.winner && (
        <button 
          onClick={handleSurrender}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}
          aria-label="Abandonner la partie"
          title="Abandonner la partie"
        >
          🏳️
        </button>
      )}

      {/* Plateau de jeu */}
      <div className="game-layout">
        <div className="board-container">
          <div className="game-board">
            {renderBoard()}
          </div>
        </div>
      </div>

      {/* Zone d'affichage des BLOK capturés */}
      <div className="common-prison">
        {Array.from({ length: game.captured_bloks_white }).map((_, i) => (
          <img key={`white-${i}`} src="/BLOK BLANC.svg" alt="blok blanc" className="captured-piece blok" />
        ))}
        {Array.from({ length: game.captured_bloks_black }).map((_, i) => (
          <img key={`black-${i}`} src="/BLOK NOIR.svg" alt="blok noir" className="captured-piece blok" />
        ))}
      </div>

      {/* Pop-up de victoire */}
      {game.winner && (
        <div className="victory-overlay">
          <div className="victory-popup">
            <h2>Victoire</h2>
            <p className="winner-text">
              Le joueur <span className={`winner-name ${game.winner}`}>
                {game.winner === 'blanc' ? game.player_white?.username : game.player_black?.username}
              </span> a gagné !
            </p>
            <button className="play-again-button" onClick={onLeave}>
              Retour au lobby
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
