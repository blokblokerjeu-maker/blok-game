import { MultiplayerGameBoard } from './MultiplayerGameBoard'

type MultiplayerGameProps = {
  gameId: string
  isWhite: boolean
  onLeave: () => void
}

export function MultiplayerGame({ gameId, isWhite, onLeave }: MultiplayerGameProps) {
  const myColor = isWhite ? 'blanc' : 'noir'
  
  return <MultiplayerGameBoard gameId={gameId} myColor={myColor} onLeave={onLeave} />
}
