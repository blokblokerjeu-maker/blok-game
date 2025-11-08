import { useState, useMemo } from 'react'
import './App.css'
import type { GameConfig } from './types/GameConfig'
import { DEFAULT_CONFIG, getBoardInfo } from './types/GameConfig'
import { generateInitialBoard, getWrappedIndex as utilGetWrappedIndex, getColumnLetters } from './utils/boardSetup'
import type { PieceType } from './utils/boardSetup'

type PlayerColor = 'blanc' | 'noir'

// Jeu simplifié : pas de phases complexes

type LocalGameProps = {
  onBack?: () => void
  config?: GameConfig
}

function LocalGame({ onBack, config = DEFAULT_CONFIG }: LocalGameProps = {}) {
  // Informations sur le plateau selon la configuration
  const boardInfo = useMemo(() => getBoardInfo(config.boardType), [config.boardType]);
  // Démarrer directement le jeu sans écran d'accueil
  const [gameStarted, setGameStarted] = useState(true)
  // État pour tracker la case actuellement sélectionnée
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  // État pour tracker le joueur actuel (blanc commence)
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('blanc')
  // État pour tracker le nombre de mouvements effectués dans le tour actuel
  const [movesInTurn, setMovesInTurn] = useState<number>(0)
  // État pour tracker la pièce jouée au premier coup (pour empêcher de la rejouer)
  const [firstMovePieceIndex, setFirstMovePieceIndex] = useState<number | null>(null)
  // État pour tracker le dernier mouvement (pour l'affichage visuel)
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null)
  // État pour les positions possibles
  const [possibleMoves, setPossibleMoves] = useState<number[]>([])
  // États pour suivre les BLOK capturés (victoire à 4 + 1 d'écart)
  const [capturedBloksWhite, setCapturedBloksWhite] = useState<number>(0)
  const [capturedBloksBlack, setCapturedBloksBlack] = useState<number>(0)
  // État pour le gagnant
  const [winner, setWinner] = useState<PlayerColor | null>(null)
  // État pour le dernier tour (quand un joueur atteint 4 BLOK)
  const [lastTurnPlayer, setLastTurnPlayer] = useState<PlayerColor | null>(null)
  // État pour les pièces sur le plateau (généré selon la configuration)
  const [pieces, setPieces] = useState<Record<number, PieceType>>(() => generateInitialBoard(config))

  // Fonction pour calculer les mouvements possibles d'une pièce BLOKER
  // Cette fonction est implémentée directement dans handleCellClick

  // Fonction pour calculer les mouvements possibles d'une pièce BLOK (avec plateau infini)
  const calculateBlokMoves = (index: number, currentPieces: Record<number, PieceType>): Set<number> => {
    const moves = new Set<number>()
    const row = Math.floor(index / boardInfo.width)
    const col = index % boardInfo.width
    const currentColor = currentPieces[index]?.includes('blanc') ? 'blanc' : 'noir'
    const opponentColor = currentColor === 'blanc' ? 'noir' : 'blanc'
    
    // Fonction utilitaire pour calculer l'index avec wrap-around (seulement pour les lignes)
    const getWrappedIndex = (targetRow: number, targetCol: number): number | null => {
      return utilGetWrappedIndex(targetRow, targetCol, boardInfo)
    }
    
    // Vérifier si une case est accessible pour un BLOK
    const canMoveTo = (targetIndex: number): boolean => {
      const targetPiece = currentPieces[targetIndex]
      
      // Si la case est vide, c'est un déplacement valide
      if (targetPiece === null) return true
      
      // Si la case contient un BLOKER (adverse ou allié), on ne peut PAS s'y déplacer
      // Un BLOK ne peut jamais capturer un BLOKER
      if (targetPiece.includes('bloker')) return false
      
      // Si la case contient un BLOK adverse, c'est une capture (valide)
      if (targetPiece.includes('blok') && targetPiece.includes(opponentColor)) return true
      
      // Si la case contient un BLOK allié, on ne peut pas s'y déplacer
      return false
    }
    
    // Vérifier si un mouvement est bloqué par un BLOKER adverse
    const isBlockedByOpponentBlocker = (startIndex: number, targetIndex: number): boolean => {
      const intermediateIndices: number[] = []
      const diff = targetIndex - startIndex
      
      // Mouvement vertical (avant/arrière)
      if (diff === -16) { // 2 cases vers le haut
        intermediateIndices.push(startIndex - 8)
      } else if (diff === +16) { // 2 cases vers le bas
        intermediateIndices.push(startIndex + 8)
      } else if (diff === -24) { // 3 cases vers le haut
        intermediateIndices.push(startIndex - 8, startIndex - 16)
      } else if (diff === +24) { // 3 cases vers le bas
        intermediateIndices.push(startIndex + 8, startIndex + 16)
      }
      // Mouvements diagonaux 2 cases
      else if (diff === -18) { // 2 cases diagonale haut-gauche
        intermediateIndices.push(startIndex - 9)
      } else if (diff === -14) { // 2 cases diagonale haut-droite
        intermediateIndices.push(startIndex - 7)
      } else if (diff === +14) { // 2 cases diagonale bas-gauche
        intermediateIndices.push(startIndex + 7)
      } else if (diff === +18) { // 2 cases diagonale bas-droite
        intermediateIndices.push(startIndex + 9)
      }
      // Mouvements diagonaux 3 cases
      else if (diff === -27) { // 3 cases diagonale haut-gauche
        intermediateIndices.push(startIndex - 9, startIndex - 18)
      } else if (diff === -21) { // 3 cases diagonale haut-droite
        intermediateIndices.push(startIndex - 7, startIndex - 14)
      } else if (diff === +21) { // 3 cases diagonale bas-gauche
        intermediateIndices.push(startIndex + 7, startIndex + 14)
      } else if (diff === +27) { // 3 cases diagonale bas-droite
        intermediateIndices.push(startIndex + 9, startIndex + 18)
      }
      
      // Si c'est un mouvement de 1 case, pas de case intermédiaire
      if (intermediateIndices.length === 0) return false
      
      // Vérifier si au moins une des cases intermédiaires contient un BLOKER adverse
      return intermediateIndices.some(idx => 
        currentPieces[idx]?.includes('bloker') && currentPieces[idx]?.includes(opponentColor)
      )
    }
    
    // Vérifier si le chemin contient une pièce adverse (BLOKER ou BLOK)
    // Les BLOK NE PEUVENT PAS sauter par-dessus des pièces adverses
    const hasOpponentPieceInPath = (indices: (number | null)[]): boolean => {
      return indices.some(idx => {
        if (idx === null) return false;
        const piece = currentPieces[idx];
        return piece !== null && piece.includes(opponentColor);
      });
    };
    
    // Vérifier si on peut sauter par-dessus une pièce alliée UNIQUEMENT
    const canJumpOver = (intermediateIndex: number): boolean => {
      // On peut sauter seulement par-dessus ses propres pièces (BLOK et BLOKER)
      const piece = currentPieces[intermediateIndex]
      return piece !== null && piece.includes(currentColor)
    }
    
    // Mouvements possibles pour BLOK blanc (vers le haut) ou noir (vers le bas)
    // Avec plateau infini : wrap-around quand on atteint les bords (seulement lignes)
    if (currentColor === 'blanc') {
      // Avant 1 case (vers le haut) - avec wrap-around
      const forwardIndex = getWrappedIndex(row - 1, col)
      if (forwardIndex !== null && canMoveTo(forwardIndex)) moves.add(forwardIndex)
      
      // Avant 2 cases (vers le haut) - avec wrap-around
      const intermediateIndex1 = getWrappedIndex(row - 1, col)
      const forward2Index = getWrappedIndex(row - 2, col)
      
      if (intermediateIndex1 !== null && forward2Index !== null &&
          (canJumpOver(intermediateIndex1) || currentPieces[intermediateIndex1] === null) 
          && !hasOpponentPieceInPath([intermediateIndex1])
          && !isBlockedByOpponentBlocker(index, forward2Index) 
          && canMoveTo(forward2Index)) {
        moves.add(forward2Index)
      }
      
      // Diagonale gauche-haut 1 case - avec wrap-around
      const diagLeftIndex = getWrappedIndex(row - 1, col - 1)
      if (diagLeftIndex !== null && canMoveTo(diagLeftIndex)) moves.add(diagLeftIndex)
      
      // Diagonale gauche-haut 2 cases - avec wrap-around
      const intermediateIndex2 = getWrappedIndex(row - 1, col - 1)
      const diagLeft2Index = getWrappedIndex(row - 2, col - 2)
      
      if (intermediateIndex2 !== null && diagLeft2Index !== null &&
          (canJumpOver(intermediateIndex2) || currentPieces[intermediateIndex2] === null) 
          && !hasOpponentPieceInPath([intermediateIndex2])
          && !isBlockedByOpponentBlocker(index, diagLeft2Index) 
          && canMoveTo(diagLeft2Index)) {
        moves.add(diagLeft2Index)
      }
      
      // Diagonale droite-haut 1 case - avec wrap-around
      const diagRightIndex = getWrappedIndex(row - 1, col + 1)
      if (diagRightIndex !== null && canMoveTo(diagRightIndex)) moves.add(diagRightIndex)
      
      // Diagonale droite-haut 2 cases - avec wrap-around
      const intermediateIndex3 = getWrappedIndex(row - 1, col + 1)
      const diagRight2Index = getWrappedIndex(row - 2, col + 2)
      
      if (intermediateIndex3 !== null && diagRight2Index !== null &&
          (canJumpOver(intermediateIndex3) || currentPieces[intermediateIndex3] === null) 
          && !hasOpponentPieceInPath([intermediateIndex3])
          && !isBlockedByOpponentBlocker(index, diagRight2Index) 
          && canMoveTo(diagRight2Index)) {
        moves.add(diagRight2Index)
      }
      
      // Avant 3 cases (vers le haut) - avec wrap-around
      const intermediate1Forward3 = getWrappedIndex(row - 1, col)
      const intermediate2Forward3 = getWrappedIndex(row - 2, col)
      const forward3Index = getWrappedIndex(row - 3, col)
      
      if (intermediate1Forward3 !== null && intermediate2Forward3 !== null && forward3Index !== null &&
          (canJumpOver(intermediate1Forward3) || currentPieces[intermediate1Forward3] === null) &&
          (canJumpOver(intermediate2Forward3) || currentPieces[intermediate2Forward3] === null) &&
          !hasOpponentPieceInPath([intermediate1Forward3, intermediate2Forward3])
          && !isBlockedByOpponentBlocker(index, forward3Index) &&
          canMoveTo(forward3Index)) {
        moves.add(forward3Index)
      }
      
      // Diagonale gauche-haut 3 cases - avec wrap-around
      const intermediate1DiagLeft3 = getWrappedIndex(row - 1, col - 1)
      const intermediate2DiagLeft3 = getWrappedIndex(row - 2, col - 2)
      const diagLeft3Index = getWrappedIndex(row - 3, col - 3)
      
      if (intermediate1DiagLeft3 !== null && intermediate2DiagLeft3 !== null && diagLeft3Index !== null &&
          (canJumpOver(intermediate1DiagLeft3) || currentPieces[intermediate1DiagLeft3] === null) &&
          (canJumpOver(intermediate2DiagLeft3) || currentPieces[intermediate2DiagLeft3] === null) &&
          !isBlockedByOpponentBlocker(index, diagLeft3Index) &&
          canMoveTo(diagLeft3Index)) {
        moves.add(diagLeft3Index)
      }
      
      // Diagonale droite-haut 3 cases - avec wrap-around
      const intermediate1DiagRight3 = getWrappedIndex(row - 1, col + 1)
      const intermediate2DiagRight3 = getWrappedIndex(row - 2, col + 2)
      const diagRight3Index = getWrappedIndex(row - 3, col + 3)
      
      if (intermediate1DiagRight3 !== null && intermediate2DiagRight3 !== null && diagRight3Index !== null &&
          (canJumpOver(intermediate1DiagRight3) || currentPieces[intermediate1DiagRight3] === null) &&
          (canJumpOver(intermediate2DiagRight3) || currentPieces[intermediate2DiagRight3] === null) &&
          !hasOpponentPieceInPath([intermediate1DiagRight3, intermediate2DiagRight3])
          && !isBlockedByOpponentBlocker(index, diagRight3Index) &&
          canMoveTo(diagRight3Index)) {
        moves.add(diagRight3Index)
      }
    } else { // BLOK noir - avec wrap-around
      // Avant 1 case (vers le bas) - avec wrap-around
      const forwardIndex = getWrappedIndex(row + 1, col)
      if (forwardIndex !== null && canMoveTo(forwardIndex)) moves.add(forwardIndex)
      
      // Avant 2 cases (vers le bas) - avec wrap-around
      const intermediateIndex1 = getWrappedIndex(row + 1, col)
      const forward2Index = getWrappedIndex(row + 2, col)
      
      if (intermediateIndex1 !== null && forward2Index !== null &&
          (canJumpOver(intermediateIndex1) || currentPieces[intermediateIndex1] === null) 
          && !hasOpponentPieceInPath([intermediateIndex1])
          && !isBlockedByOpponentBlocker(index, forward2Index) 
          && canMoveTo(forward2Index)) {
        moves.add(forward2Index)
      }
      
      // Diagonale gauche-bas 1 case - avec wrap-around
      const diagLeftIndex = getWrappedIndex(row + 1, col - 1)
      if (diagLeftIndex !== null && canMoveTo(diagLeftIndex)) moves.add(diagLeftIndex)
      
      // Diagonale gauche-bas 2 cases - avec wrap-around
      const intermediateIndex2 = getWrappedIndex(row + 1, col - 1)
      const diagLeft2Index = getWrappedIndex(row + 2, col - 2)
      
      if (intermediateIndex2 !== null && diagLeft2Index !== null &&
          (canJumpOver(intermediateIndex2) || currentPieces[intermediateIndex2] === null) 
          && !hasOpponentPieceInPath([intermediateIndex2])
          && !isBlockedByOpponentBlocker(index, diagLeft2Index) 
          && canMoveTo(diagLeft2Index)) {
        moves.add(diagLeft2Index)
      }
      
      // Diagonale droite-bas 1 case - avec wrap-around
      const diagRightIndex = getWrappedIndex(row + 1, col + 1)
      if (diagRightIndex !== null && canMoveTo(diagRightIndex)) moves.add(diagRightIndex)
      
      // Diagonale droite-bas 2 cases - avec wrap-around
      const intermediateIndex3 = getWrappedIndex(row + 1, col + 1)
      const diagRight2Index = getWrappedIndex(row + 2, col + 2)
      
      if (intermediateIndex3 !== null && diagRight2Index !== null &&
          (canJumpOver(intermediateIndex3) || currentPieces[intermediateIndex3] === null) 
          && !hasOpponentPieceInPath([intermediateIndex3])
          && !isBlockedByOpponentBlocker(index, diagRight2Index) 
          && canMoveTo(diagRight2Index)) {
        moves.add(diagRight2Index)
      }
      
      // Avant 3 cases (vers le bas) - avec wrap-around
      const intermediate1Forward3 = getWrappedIndex(row + 1, col)
      const intermediate2Forward3 = getWrappedIndex(row + 2, col)
      const forward3Index = getWrappedIndex(row + 3, col)
      
      if (intermediate1Forward3 !== null && intermediate2Forward3 !== null && forward3Index !== null &&
          (canJumpOver(intermediate1Forward3) || currentPieces[intermediate1Forward3] === null) &&
          (canJumpOver(intermediate2Forward3) || currentPieces[intermediate2Forward3] === null) &&
          !hasOpponentPieceInPath([intermediate1Forward3, intermediate2Forward3])
          && !isBlockedByOpponentBlocker(index, forward3Index) &&
          canMoveTo(forward3Index)) {
        moves.add(forward3Index)
      }
      
      // Diagonale gauche-bas 3 cases - avec wrap-around
      const intermediate1DiagLeft3 = getWrappedIndex(row + 1, col - 1)
      const intermediate2DiagLeft3 = getWrappedIndex(row + 2, col - 2)
      const diagLeft3Index = getWrappedIndex(row + 3, col - 3)
      
      if (intermediate1DiagLeft3 !== null && intermediate2DiagLeft3 !== null && diagLeft3Index !== null &&
          (canJumpOver(intermediate1DiagLeft3) || currentPieces[intermediate1DiagLeft3] === null) &&
          (canJumpOver(intermediate2DiagLeft3) || currentPieces[intermediate2DiagLeft3] === null) &&
          !isBlockedByOpponentBlocker(index, diagLeft3Index) &&
          canMoveTo(diagLeft3Index)) {
        moves.add(diagLeft3Index)
      }
      
      // Diagonale droite-bas 3 cases - avec wrap-around
      const intermediate1DiagRight3 = getWrappedIndex(row + 1, col + 1)
      const intermediate2DiagRight3 = getWrappedIndex(row + 2, col + 2)
      const diagRight3Index = getWrappedIndex(row + 3, col + 3)
      
      if (intermediate1DiagRight3 !== null && intermediate2DiagRight3 !== null && diagRight3Index !== null &&
          (canJumpOver(intermediate1DiagRight3) || currentPieces[intermediate1DiagRight3] === null) &&
          (canJumpOver(intermediate2DiagRight3) || currentPieces[intermediate2DiagRight3] === null) &&
          !hasOpponentPieceInPath([intermediate1DiagRight3, intermediate2DiagRight3])
          && !isBlockedByOpponentBlocker(index, diagRight3Index) &&
          canMoveTo(diagRight3Index)) {
        moves.add(diagRight3Index)
      }
    }
    return moves
  }

  // Fonction simplifiée pour gérer le clic sur une case
  const handleCellClick = (index: number) => {
    const piece = pieces[index]
    
    // CAS 1: Si on clique sur une pièce du joueur actuel
    if (piece && ((currentPlayer === 'blanc' && piece.includes('blanc')) || (currentPlayer === 'noir' && piece.includes('noir')))) {
      // En mode 2 coups par tour, empêcher de sélectionner la pièce jouée au premier coup
      if (config.movesPerTurn === 2 && movesInTurn === 1 && firstMovePieceIndex === index) {
        // Afficher un message ou ne rien faire
        console.log('❌ Vous ne pouvez pas jouer la même pièce deux fois dans le même tour')
        return
      }
      
      // Si on clique sur la même pièce déjà sélectionnée, on désélectionne
      if (selectedCell === index) {
        setSelectedCell(null)
        setPossibleMoves([])
        return
      }
      
      // Sélectionner la pièce
      setSelectedCell(index)
      
      // BLOKER: TÉLÉPORTATION - peut aller UNIQUEMENT sur des cases vides
      if (piece.includes('bloker')) {
        const allMoves = [];
        
        // Parcourir TOUTES les cases du plateau (téléportation)
        for (let i = 0; i < boardInfo.totalCells; i++) {
          // Ignorer les cases désactivées (coins)
          if (boardInfo.disabledCells.includes(i)) continue;
          
          // BLOKER peut se téléporter UNIQUEMENT sur les cases vides
          // Les BLOKER ne peuvent PAS capturer (ni BLOK ni BLOKER)
          if (pieces[i] === null) {
            allMoves.push(i);
          }
        }
        
        setPossibleMoves(allMoves);
      }
      // BLOK: mouvement limité
      else if (piece.includes('blok')) {
        const blokMoves = Array.from(calculateBlokMoves(index, pieces))
        setPossibleMoves(blokMoves)
      }
    }
    // CAS 2: Phase normale - Si on clique sur une destination valide
    else if (selectedCell !== null && possibleMoves.includes(index)) {
      const newPieces = { ...pieces }
      const selectedPiece = pieces[selectedCell]
      const targetPiece = pieces[index]
      
      // Vérifier s'il s'agit d'une capture (BLOK capturant un BLOK adverse)
      const isCapture = targetPiece !== null && 
                       targetPiece?.includes('blok') && 
                       selectedPiece?.includes('blok') && 
                       ((selectedPiece?.includes('blanc') && targetPiece?.includes('noir')) ||
                        (selectedPiece?.includes('noir') && targetPiece?.includes('blanc')))
      
      // Mise à jour du plateau: pièce déplacée à la nouvelle position et ancienne position vidée
      newPieces[index] = selectedPiece
      newPieces[selectedCell] = null
      setPieces(newPieces)
      
      // Enregistrer le dernier mouvement pour l'affichage visuel
      setLastMove({ from: selectedCell, to: index })
      
      // Réinitialiser la sélection
      setSelectedCell(null)
      setPossibleMoves([])
      
      // Si c'est une capture
      if (isCapture) {
        console.log(`Capture d'un BLOK ${targetPiece?.includes('blanc') ? 'BLANC' : 'NOIR'} !`)
        
        // Calculer les nouveaux compteurs
        let newCapturedWhite = capturedBloksWhite
        let newCapturedBlack = capturedBloksBlack
        
        if (currentPlayer === 'blanc' && targetPiece?.includes('noir')) {
          // Le joueur blanc a capturé un BLOK noir
          newCapturedBlack = capturedBloksBlack + 1
          setCapturedBloksBlack(newCapturedBlack)
        } else if (currentPlayer === 'noir' && targetPiece?.includes('blanc')) {
          // Le joueur noir a capturé un BLOK blanc
          newCapturedWhite = capturedBloksWhite + 1
          setCapturedBloksWhite(newCapturedWhite)
        }
        
        const opponentPlayer = currentPlayer === 'blanc' ? 'noir' : 'blanc'
        
        // PRIORITÉ 1 : Si on est dans un dernier tour, vérifier victoire ou égalisation
        if (lastTurnPlayer === currentPlayer) {
          // C'est le dernier tour de ce joueur après sa capture
          if (newCapturedWhite >= config.captureGoal && newCapturedWhite > newCapturedBlack) {
            setWinner('noir') // Le noir gagne (a capturé l'objectif de BLOK blancs avec écart)
            return
          } else if (newCapturedBlack >= config.captureGoal && newCapturedBlack > newCapturedWhite) {
            setWinner('blanc') // Le blanc gagne (a capturé l'objectif de BLOK noirs avec écart)
            return
          } else {
            // L'adversaire a égalisé, la partie continue normalement
            console.log('Égalisation ! La partie continue.')
            setLastTurnPlayer(null)
          }
        }
        
        // PRIORITÉ 2 : Vérifier si quelqu'un a >= objectif BLOK avec un écart → Dernier tour systématique
        if ((newCapturedWhite >= config.captureGoal || newCapturedBlack >= config.captureGoal) && newCapturedWhite !== newCapturedBlack) {
          // Il y a un écart (peu importe la taille) → Dernier tour pour l'adversaire
          const leadingScore = Math.max(newCapturedWhite, newCapturedBlack)
          console.log(`${currentPlayer.toUpperCase()} a ${leadingScore} BLOK capturés ! Dernier tour pour ${opponentPlayer.toUpperCase()}.`)
          setLastTurnPlayer(opponentPlayer)
        }
        // Si égalité (4-4, 5-5...), on continue normalement sans dernier tour
        
        // Gérer les mouvements multiples par tour
        const newMovesInTurn = movesInTurn + 1
        if (newMovesInTurn >= config.movesPerTurn) {
          // Tour complet, passer au joueur suivant
          setCurrentPlayer(opponentPlayer)
          setMovesInTurn(0)
          setFirstMovePieceIndex(null) // Réinitialiser pour le nouveau tour
        } else {
          // Encore des mouvements à jouer dans ce tour
          setMovesInTurn(newMovesInTurn)
          // Enregistrer la pièce jouée au premier coup (départ du mouvement)
          if (movesInTurn === 0) {
            setFirstMovePieceIndex(selectedCell)
          }
        }
        // Réinitialiser la sélection pour le prochain mouvement
        setSelectedCell(null)
        setPossibleMoves([])
      } else {
        // Simple déplacement (pas de capture)
        
        // Vérifier si on était dans un dernier tour
        if (lastTurnPlayer === currentPlayer) {
          // C'est le dernier tour de ce joueur, il n'a pas capturé
          // Vérifier la victoire : si l'adversaire a toujours >= objectif avec un écart
          if (capturedBloksWhite >= config.captureGoal && capturedBloksWhite > capturedBloksBlack) {
            setWinner('noir') // Le noir gagne
            return
          } else if (capturedBloksBlack >= config.captureGoal && capturedBloksBlack > capturedBloksWhite) {
            setWinner('blanc') // Le blanc gagne
            return
          } else {
            // Pas de victoire après le dernier tour (égalité impossible sans capture)
            console.log('Dernier tour terminé sans capture, la partie continue.')
            setLastTurnPlayer(null)
          }
        }
        // Si ce n'est pas un dernier tour, on ne vérifie PAS la victoire
        // (la victoire se vérifie uniquement après le dernier tour de l'adversaire)
        
        // Gérer les mouvements multiples par tour
        const newMovesInTurn = movesInTurn + 1
        if (newMovesInTurn >= config.movesPerTurn) {
          // Tour complet, passer au joueur suivant
          setCurrentPlayer(currentPlayer === 'blanc' ? 'noir' : 'blanc')
          setMovesInTurn(0)
          setFirstMovePieceIndex(null) // Réinitialiser pour le nouveau tour
        } else {
          // Encore des mouvements à jouer dans ce tour
          setMovesInTurn(newMovesInTurn)
          // Enregistrer la pièce jouée au premier coup (départ du mouvement)
          if (movesInTurn === 0) {
            setFirstMovePieceIndex(selectedCell)
          }
        }
        // Réinitialiser la sélection pour le prochain mouvement
        setSelectedCell(null)
        setPossibleMoves([])
      }
    }
    // CAS 3: Clic ailleurs, désélectionner
    else {
      setSelectedCell(null)
      setPossibleMoves([])
    }
  }

  // Génère le plateau selon la configuration
  const renderBoard = () => {
    const cells = []
    const letters = getColumnLetters(boardInfo)
    
    for (let i = 0; i < boardInfo.totalCells; i++) {
      // Vérifier si la case est désactivée (coins pour 8x8-no-corners)
      if (boardInfo.disabledCells.includes(i)) {
        cells.push(
          <div key={i} className="board-cell disabled">
            {/* Case désactivée */}
          </div>
        )
        continue
      }
      
      const isSelected = selectedCell === i
      const isPossibleMove = possibleMoves.includes(i)
      const isLastMoveCell = lastMove && (lastMove.from === i || lastMove.to === i)
      
      const piece = pieces[i]
      
      // Vérifier si c'est une capture possible
      const isCapturableMove = isPossibleMove && piece !== null && piece.includes('blok')
      
      // Calculer si c'est la première colonne (colonne de gauche)
      const isLeftColumn = i % boardInfo.width === 0
      
      // Calculer le numéro de ligne (de 1 à height, du bas vers le haut)
      const row = Math.floor(i / boardInfo.width)
      const lineNumber = boardInfo.height - row
      
      // Calculer si c'est la dernière ligne (ligne du bas)
      const isBottomRow = row === boardInfo.height - 1
      const column = i % boardInfo.width
      const letter = letters[column]
      
      // Mapper les pièces SVG
      const getPieceImage = (pieceType: PieceType) => {
        switch (pieceType) {
          case 'blok-blanc':
            return '/BLOK BLANC.svg'
          case 'blok-noir':
            return '/BLOK NOIR.svg'
          case 'bloker-blanc':
            return '/BLOKER BLANC.svg'
          case 'bloker-noir':
            return '/BLOKER NOIR.svg'
          default:
            return null
        }
      }
      
      const pieceImage = getPieceImage(piece)
      const isBloker = piece && piece.includes('bloker')
      
      // Calculer la couleur de la case (damier)
      const isWhiteCell = (row + column) % 2 === 0
      const cellColor = isWhiteCell ? '#F2F5FA' : '#5596F2'
      const cellColorClicked = isWhiteCell ? '#9AEBEE' : '#4CBBE9'
      const textColor = isWhiteCell ? '#5596F2' : '#F2F5FA'
      
      cells.push(
        <div 
          key={i} 
          className={`board-cell ${isSelected ? 'clicked' : ''} ${isPossibleMove ? 'possible-move' : ''}`}
          onClick={() => handleCellClick(i)}
          style={{
            backgroundColor: (isSelected || isLastMoveCell) ? cellColorClicked : cellColor
          }}
        >
          {isLeftColumn && (
            <span className="line-number" style={{ color: textColor }}>{lineNumber}</span>
          )}
          {piece && pieceImage && (
            <img 
            src={pieceImage} 
            alt="piece" 
            className={`piece ${isBloker ? 'bloker' : ''}`}
          />
          )}
          {isPossibleMove && pieces[i] === null && (
            <div 
              className="move-indicator"
              title="Mouvement possible"
            ></div>
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
          {isBottomRow && (
            <span className="column-letter" style={{ color: textColor }}>{letter}</span>
          )}
        </div>
      )
    }
    return cells
  }

  if (!gameStarted) {
    return (
      <div className="home-container">
        <div className="home-content">
          <h1 className="game-title">BLOK</h1>
          <button 
            className="play-button"
            onClick={() => setGameStarted(true)}
          >
            Jouer
          </button>
          {onBack && (
            <button 
              className="back-button"
              onClick={onBack}
              style={{ marginTop: '15px', fontSize: '14px', padding: '10px 30px' }}
            >
              ← Retour au lobby
            </button>
          )}
        </div>
      </div>
    )
  }

  // Rendu d'une ligne de pièces capturées/éliminées
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

  const handleSurrender = () => {
    if (window.confirm(`Le joueur ${currentPlayer === 'blanc' ? 'BLANC' : 'NOIR'} abandonne. Voulez-vous recommencer une partie ?`)) {
      // Réinitialiser la partie
      window.location.reload()
    }
  }

  return (
    <div className="game-container">
      {/* Bouton retour au lobby */}
      {onBack && (
        <button 
          onClick={onBack}
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
      )}

      {/* Bouton d'abandon */}
      {!winner && (
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
      <div className="game-layout">
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
        </div>
      </div>
      
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
            color: currentPlayer === 'blanc' ? '#5596F2' : '#333',
            marginBottom: '4px'
          }}>
            Tour du joueur {currentPlayer.toUpperCase()}
          </div>
          {lastTurnPlayer && (
            <div style={{
              fontSize: '13px',
              color: '#e74c3c',
              marginTop: '4px',
              fontWeight: 'bold'
            }}>
              ⚠️ DERNIER TOUR
            </div>
          )}
        </div>
      )}
      
      {/* Zone d'affichage des BLOK capturés */}
      <div className="common-prison">
        {/* BLOK BLANCS capturés */}
        {renderCapturedPieces('blok', 'blanc', capturedBloksWhite)}
        {/* BLOK NOIRS capturés */}
        {renderCapturedPieces('blok', 'noir', capturedBloksBlack)}
      </div>
      
      {/* Pop-up de victoire */}
      {winner && (
        <div className="victory-overlay">
          <div className="victory-popup">
            <h2>Victoire</h2>
            <p className="winner-text">
              Le joueur <span className={`winner-name ${winner}`}>{winner.toUpperCase()}</span> a gagné
            </p>
            <button 
              className="play-again-button"
              onClick={() => window.location.reload()}
            >
              Rejouer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LocalGame