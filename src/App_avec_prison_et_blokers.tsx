import { useState } from 'react'
import './App.css'

type PieceType = 'blok-blanc' | 'blok-noir' | 'bloker-blanc' | 'bloker-noir' | null
type PlayerColor = 'blanc' | 'noir'

// Phase du jeu: normal, retrait de BLOKER, ou repositionnement d'un BLOK récupéré
type GamePhase = 'normal' | 'remove-bloker' | 'reposition-blok'

function App() {
  // État pour gérer l'écran actuel (accueil ou jeu)
  const [gameStarted, setGameStarted] = useState(false)
  // État pour tracker la case actuellement sélectionnée
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  // État pour tracker le joueur actuel (blanc commence)
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('blanc')
  // État pour les positions possibles
  const [possibleMoves, setPossibleMoves] = useState<number[]>([])
  // État pour la phase de jeu (normal ou retrait de BLOKER après capture)
  const [gamePhase, setGamePhase] = useState<GamePhase>('normal')
  // État pour stocker le dernier joueur qui a capturé (pour savoir qui doit perdre un BLOKER)
  const [lastCapturingPlayer, setLastCapturingPlayer] = useState<PlayerColor | null>(null)
  // État pour stocker le joueur qui doit repositionner un BLOK récupéré
  const [repositioningPlayer, setRepositioningPlayer] = useState<PlayerColor | null>(null)
  // États pour suivre les pièces capturées/éliminées
  const [capturedBloksWhite, setCapturedBloksWhite] = useState<number>(0)
  const [capturedBloksBlack, setCapturedBloksBlack] = useState<number>(0)
  const [eliminatedBlokersWhite, setEliminatedBlokersWhite] = useState<number>(0)
  const [eliminatedBlokersBlack, setEliminatedBlokersBlack] = useState<number>(0)
  // État pour le gagnant
  const [winner, setWinner] = useState<PlayerColor | null>(null)
  // État pour les pièces sur le plateau
  const [pieces, setPieces] = useState<Record<number, PieceType>>(() => {
    const board: Record<number, PieceType> = {}
    for (let i = 0; i < 64; i++) {
      board[i] = null
    }
    // BLOK NOIR ligne 8 (indices 0-7, colonnes a-h)
    board[0] = 'blok-noir'
    board[1] = 'blok-noir'
    board[2] = 'blok-noir'
    board[3] = 'blok-noir'
    board[4] = 'blok-noir'
    board[5] = 'blok-noir'
    board[6] = 'blok-noir'
    board[7] = 'blok-noir'
    // BLOKER NOIR ligne 7 (indices 10-13, colonnes c-f)
    board[10] = 'bloker-noir'
    board[11] = 'bloker-noir'
    board[12] = 'bloker-noir'
    board[13] = 'bloker-noir'
    // BLOKER BLANC ligne 2 (indices 50-53, colonnes c-f)
    board[50] = 'bloker-blanc'
    board[51] = 'bloker-blanc'
    board[52] = 'bloker-blanc'
    board[53] = 'bloker-blanc'
    // BLOK BLANC ligne 1 (indices 56-63, colonnes a-h)
    board[56] = 'blok-blanc'
    board[57] = 'blok-blanc'
    board[58] = 'blok-blanc'
    board[59] = 'blok-blanc'
    board[60] = 'blok-blanc'
    board[61] = 'blok-blanc'
    board[62] = 'blok-blanc'
    board[63] = 'blok-blanc'
    
    // Le plateau contient maintenant 64 cases (8x8) avec les mêmes pièces initiales
    return board
  })

  // Fonction pour calculer les mouvements possibles d'une pièce BLOKER
  // Cette fonction est implémentée directement dans handleCellClick

  // Fonction pour calculer les mouvements possibles d'une pièce BLOK (avec plateau infini)
  const calculateBlokMoves = (index: number, currentPieces: Record<number, PieceType>): Set<number> => {
    const moves = new Set<number>()
    const row = Math.floor(index / 8)
    const col = index % 8
    const currentColor = currentPieces[index]?.includes('blanc') ? 'blanc' : 'noir'
    const opponentColor = currentColor === 'blanc' ? 'noir' : 'blanc'
    
    // Fonction utilitaire pour calculer l'index avec wrap-around (seulement pour les lignes)
    const getWrappedIndex = (targetRow: number, targetCol: number): number | null => {
      // Wrap-around pour les lignes (0-7) - plateau infini verticalement
      const wrappedRow = ((targetRow % 8) + 8) % 8
      
      // Les colonnes NE wrappent PAS - elles doivent rester dans les limites (0-7)
      if (targetCol < 0 || targetCol > 7) {
        return null // Mouvement invalide
      }
      
      return wrappedRow * 8 + targetCol
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
    
    // Vérifier si on peut sauter par-dessus une pièce alliée
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
          !isBlockedByOpponentBlocker(index, forward3Index) &&
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
          !isBlockedByOpponentBlocker(index, diagRight3Index) &&
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
          !isBlockedByOpponentBlocker(index, forward3Index) &&
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
          !isBlockedByOpponentBlocker(index, diagRight3Index) &&
          canMoveTo(diagRight3Index)) {
        moves.add(diagRight3Index)
      }
    }
    return moves
  }

  // Trouver tous les BLOKER disponibles d'un joueur donné
  const getBlokerPositions = (playerColor: PlayerColor): number[] => {
    const positions: number[] = []
    for (let i = 0; i < 64; i++) {
      if (pieces[i]?.includes('bloker') && pieces[i]?.includes(playerColor)) {
        positions.push(i)
      }
    }
    return positions
  }

  // Vérifier les conditions de victoire
  const checkWinCondition = (currentPieces: Record<number, PieceType>): PlayerColor | null => {
    // Compter les BLOKER de chaque joueur sur le plateau
    let whiteBlokersCount = 0
    let blackBlokersCount = 0
    
    for (let i = 0; i < 64; i++) {
      if (currentPieces[i]?.includes('bloker')) {
        if (currentPieces[i]?.includes('blanc')) {
          whiteBlokersCount++
        } else if (currentPieces[i]?.includes('noir')) {
          blackBlokersCount++
        }
      }
    }
    
    // Le premier joueur à ne plus avoir de BLOKER sur le plateau gagne
    if (whiteBlokersCount === 0) {
      return 'blanc' // Le joueur blanc gagne
    }
    if (blackBlokersCount === 0) {
      return 'noir' // Le joueur noir gagne
    }
    
    return null // Pas de gagnant
  }

  // Fonction pour gérer le clic sur une case - Réécrite pour gérer les captures
  const handleCellClick = (index: number) => {
    const piece = pieces[index]
    
    // Phase de repositionnement d'un BLOK récupéré
    if (gamePhase === 'reposition-blok') {
      // Vérifier si le joueur clique sur une case vide parmi les possibilités
      if (pieces[index] === null && possibleMoves.includes(index)) {
        // Placer un nouveau BLOK de la couleur du joueur actuel
        const newPieces = { ...pieces }
        newPieces[index] = `blok-${currentPlayer}`
        setPieces(newPieces)
        
        // Réinitialiser l'état de repositionnement
        setRepositioningPlayer(null)
        
        // Après avoir repositionné un BLOK, c'est toujours à l'adversaire de retirer un BLOKER
        // du joueur qui vient de faire la capture et le repositionnement
        
        const opponentPlayer = currentPlayer === 'blanc' ? 'noir' : 'blanc';
        const blokersThatCanBeRemoved = getBlokerPositions(currentPlayer);
        
        if (blokersThatCanBeRemoved.length > 0) {
          // L'adversaire retire un BLOKER du joueur qui a capturé
          setGamePhase('remove-bloker');
          setCurrentPlayer(opponentPlayer); // C'est au tour de l'adversaire
          
          // Mettre en évidence les BLOKER qui peuvent être retirés
          setPossibleMoves(blokersThatCanBeRemoved);
          setLastCapturingPlayer(currentPlayer); // Pour identifier les BLOKER à retirer
        } else {
          // Si le joueur n'a plus de BLOKER à retirer, passer directement au tour de l'adversaire
          setGamePhase('normal');
          setCurrentPlayer(opponentPlayer);
          setPossibleMoves([]);
        }
      }
      return
    }
    
    // Si nous sommes en phase de suppression de BLOKER après une capture
    if (gamePhase === 'remove-bloker') {
      // Vérifier si le joueur clique sur un BLOKER du joueur qui a capturé (donc l'adversaire actuel)
      if (piece?.includes('bloker') && piece?.includes(lastCapturingPlayer as PlayerColor)) {
        // Supprimer le BLOKER
        const newPieces = { ...pieces }
        newPieces[index] = null
        setPieces(newPieces)
        
        // Mettre à jour le compteur des BLOKER éliminés
        if (lastCapturingPlayer === 'blanc') {
          setEliminatedBlokersWhite(eliminatedBlokersWhite + 1)
        } else {
          setEliminatedBlokersBlack(eliminatedBlokersBlack + 1)
        }
        
        // Vérifier les conditions de victoire après l'élimination d'un BLOKER
        const gameWinner = checkWinCondition(newPieces)
        if (gameWinner) {
          setWinner(gameWinner)
          return // Arrêter le jeu
        }
        
        // Déterminer le flux après le retrait du BLOKER
        if (repositioningPlayer === currentPlayer) {
          // Passage direct à la phase de repositionnement du BLOK récupéré
          setGamePhase('reposition-blok')
          
          // Trouver toutes les cases vides pour le repositionnement
          const emptySpaces = []
          for (let i = 0; i < 64; i++) {
            if (pieces[i] === null) {
              emptySpaces.push(i)
            }
          }
          
          // Mettre à jour les mouvements possibles (toutes les cases vides)
          setPossibleMoves(emptySpaces)
          
          // Le joueur actuel reste le même pour repositionner son BLOK
        } else {
          // Retour à la phase normale
          setGamePhase('normal')
          
          // Le joueur qui a perdu un BLOK et qui vient de retirer un BLOKER adverse joue son tour
          // (Pas besoin de changer currentPlayer car c'est déjà le bon joueur)
        }
      } else {
        // Ne rien faire si le joueur ne clique pas sur un BLOKER du joueur qui a capturé
        // La bordure rouge sur les BLOKER à retirer est suffisante comme indication
      }
      return
    }
    
    // CAS 1: Phase normale - Si on clique sur une pièce du joueur actuel
    if (piece && ((currentPlayer === 'blanc' && piece.includes('blanc')) || (currentPlayer === 'noir' && piece.includes('noir')))) {
      // Si on clique sur la même pièce déjà sélectionnée, on désélectionne
      if (selectedCell === index) {
        setSelectedCell(null)
        setPossibleMoves([])
        return
      }
      
      // Sélectionner la pièce
      setSelectedCell(index)
      
      // BLOKER: peut aller n'importe où (toutes les cases vides)
      if (piece.includes('bloker')) {
        // Permettre aux BLOKER de se déplacer sur n'importe quelle case vide
        const allMoves = [];
        
        // Collecter toutes les cases vides du plateau
        for (let i = 0; i < 64; i++) {
          if (pieces[i] === null) {
            allMoves.push(i);
          }
        }
        
        // Mettre à jour l'état avec les cases vides
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
      
      // Réinitialiser la sélection
      setSelectedCell(null)
      setPossibleMoves([])
      
      // Si c'est une capture
      if (isCapture) {
        console.log(`Capture d'un BLOK ${targetPiece?.includes('blanc') ? 'BLANC' : 'NOIR'} !`)
        
        // Définir l'adversaire (joueur qui vient de perdre un BLOK)
        const opponentPlayer = currentPlayer === 'blanc' ? 'noir' : 'blanc'
        
        // Logique de prison commune (peut contenir plusieurs BLOK) :
        // 1. Si au moins un BLOK de MA couleur est en prison, j'en récupère UN et dois le repositionner
        // 2. Le BLOK adverse capturé est toujours ajouté à la prison
        // 3. Si j'ai récupéré un BLOK, je le repositionne AVANT que l'adversaire ne retire un BLOKER
        // 4. On peut avoir plusieurs BLOK de chaque couleur en prison simultanément
        
        // Vérifier si un BLOK est déjà en prison
        const prisonHasWhiteBlok = capturedBloksWhite > 0;
        const prisonHasBlackBlok = capturedBloksBlack > 0;
        
        // Variable locale pour savoir si un BLOK a été libéré de prison
        let blokLiberated = false;
        
        // Gestion du joueur blanc qui capture un BLOK noir
        if (currentPlayer === 'blanc' && targetPiece?.includes('noir')) {
          // Si un BLOK BLANC est en prison, le joueur BLANC en récupère un
          if (prisonHasWhiteBlok) {
            console.log('Le joueur BLANC récupère un de ses BLOK de la prison!')
            setCapturedBloksWhite(capturedBloksWhite - 1); // Libérer UN BLOK blanc
            setRepositioningPlayer(currentPlayer); // Le joueur BLANC doit repositionner son BLOK
            blokLiberated = true; // Marquer qu'un BLOK a été libéré
          }
          
          // Le BLOK NOIR capturé est ajouté à la prison
          console.log('Le BLOK NOIR est mis en prison')
          setCapturedBloksBlack(capturedBloksBlack + 1); // Ajouter le BLOK à la prison
        }
        // Gestion du joueur noir qui capture un BLOK blanc
        else if (currentPlayer === 'noir' && targetPiece?.includes('blanc')) {
          // Si un BLOK NOIR est en prison, le joueur NOIR en récupère un
          if (prisonHasBlackBlok) {
            console.log('Le joueur NOIR récupère un de ses BLOK de la prison!')
            setCapturedBloksBlack(capturedBloksBlack - 1); // Libérer UN BLOK noir
            setRepositioningPlayer(currentPlayer); // Le joueur NOIR doit repositionner son BLOK
            blokLiberated = true; // Marquer qu'un BLOK a été libéré
          }
          
          // Le BLOK BLANC capturé est ajouté à la prison
          console.log('Le BLOK BLANC est mis en prison')
          setCapturedBloksWhite(capturedBloksWhite + 1); // Ajouter le BLOK à la prison
        }
        
        // Stocker le joueur qui a fait la capture
        setLastCapturingPlayer(currentPlayer)
        
        // C'est à l'adversaire de supprimer un BLOKER du joueur qui a capturé
        
        // Vérifier si le joueur qui a capturé a encore des BLOKER qui peuvent être retirés
        const blokersThatCanBeRemoved = getBlokerPositions(currentPlayer)
        
        // Si un BLOK a été libéré de prison, passer IMMÉDIATEMENT à la phase de repositionnement
        if (blokLiberated) {
          // Passer d'abord à la phase de repositionnement du BLOK récupéré
          setGamePhase('reposition-blok')
          
          // Trouver toutes les cases vides pour le repositionnement
          const emptySpaces = []
          for (let i = 0; i < 64; i++) {
            if (pieces[i] === null) {
              emptySpaces.push(i)
            }
          }
          
          // Mettre à jour les mouvements possibles (toutes les cases vides)
          setPossibleMoves(emptySpaces)
          
          // Le joueur actuel repositionne son BLOK
          // (pas de changement de joueur)
        }
        // Si le joueur n'a pas de BLOK à repositionner, passer directement à la phase de retrait du BLOKER
        else if (blokersThatCanBeRemoved.length > 0) {
          // Passer à la phase de suppression de BLOKER
          setGamePhase('remove-bloker')
          setCurrentPlayer(opponentPlayer)
          
          // Mettre en évidence les BLOKER qui peuvent être retirés (ceux du joueur qui a capturé)
          setPossibleMoves(blokersThatCanBeRemoved)
        } else {
          // Si le joueur qui a capturé n'a plus de BLOKER, la partie continue normalement
          // Passer au joueur suivant
          setCurrentPlayer(opponentPlayer)
        }
      } else {
        // Simple déplacement, passer au joueur suivant
        setCurrentPlayer(currentPlayer === 'blanc' ? 'noir' : 'blanc')
      }
    }
    // CAS 3: Clic ailleurs, désélectionner
    else {
      setSelectedCell(null)
      setPossibleMoves([])
    }
  }

  // Génère le plateau 8x8 (64 cases)
  const renderBoard = () => {
    const cells = []
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    
    for (let i = 0; i < 64; i++) {
      const isSelected = selectedCell === i
      const isPossibleMove = possibleMoves.includes(i)
      
      // Vérification des mouvements possibles - pas besoin de logs
      const piece = pieces[i]
      
      // Calculer si c'est la première colonne (colonne de gauche)
      const isLeftColumn = i % 8 === 0
      
      // Calculer le numéro de ligne (de 1 à 8, du bas vers le haut)
      const row = Math.floor(i / 8) // 0 à 7
      const lineNumber = 8 - row // 8 à 1 (inversé)
      
      // Calculer si c'est la dernière ligne (ligne du bas)
      const isBottomRow = row === 7
      const column = i % 8 // 0 à 7
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
      
      cells.push(
        <div 
          key={i} 
          className={`board-cell ${isSelected ? 'clicked' : ''} ${isPossibleMove ? 'possible-move' : ''}`}
          onClick={() => handleCellClick(i)}
        >
          {isLeftColumn && (
            <span className="line-number">{lineNumber}</span>
          )}
          {piece && pieceImage && (
            <img 
            src={pieceImage} 
            alt="piece" 
            className={`piece ${isBloker ? 'bloker' : ''} ${gamePhase === 'remove-bloker' && piece?.includes(lastCapturingPlayer as string) && piece?.includes('bloker') ? 'removable-bloker' : ''}`}
          />
          )}
          {isPossibleMove && pieces[i] === null && (
            <div 
              className={`move-indicator ${gamePhase === 'reposition-blok' ? 'reposition-indicator' : ''}`}
              title={gamePhase === 'reposition-blok' ? 'Position disponible pour votre BLOK récupéré' : 'Mouvement possible'}
            ></div>
          )}
          {isBottomRow && (
            <span className="column-letter">{letter}</span>
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

  return (
    <div className="game-container">
      <div className="game-layout">
        <div className="board-container">
          <div className="game-board">
            {renderBoard()}
          </div>
        </div>
      </div>
      
      {/* Zone commune de prison en bas (toutes les pièces sur une ligne) */}
      <div className="common-prison">
        {/* BLOK BLANCS emprisonnés */}
        {renderCapturedPieces('blok', 'blanc', capturedBloksWhite)}
        {/* BLOK NOIRS emprisonnés */}
        {renderCapturedPieces('blok', 'noir', capturedBloksBlack)}
        {/* BLOKER BLANCS éliminés */}
        {renderCapturedPieces('bloker', 'blanc', eliminatedBlokersWhite)}
        {/* BLOKER NOIRS éliminés */}
        {renderCapturedPieces('bloker', 'noir', eliminatedBlokersBlack)}
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

export default App