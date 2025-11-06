import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { Lobby } from './components/Lobby'
import { MultiplayerGame } from './components/MultiplayerGame'
import LocalGame from './LocalGame'

type GameMode = 'lobby' | 'local' | 'multiplayer'

export default function App() {
  const { user, loading } = useAuth()
  const [gameMode, setGameMode] = useState<GameMode>('lobby')
  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(null)
  const [isWhitePlayer, setIsWhitePlayer] = useState(false)

  if (loading) {
    return (
      <div className="loading-screen">
        <h1 className="game-title">BLOK</h1>
        <p>Chargement...</p>
      </div>
    )
  }

  // Si l'utilisateur n'est pas connecté, afficher l'écran d'authentification
  if (!user) {
    return <Auth />
  }

  // Gestion des différents modes de jeu
  if (gameMode === 'local') {
    return <LocalGame onBack={() => setGameMode('lobby')} />
  }

  if (gameMode === 'multiplayer' && multiplayerGameId) {
    return (
      <MultiplayerGame
        gameId={multiplayerGameId}
        isWhite={isWhitePlayer}
        onLeave={() => {
          setGameMode('lobby')
          setMultiplayerGameId(null)
        }}
      />
    )
  }

  // Par défaut, afficher le lobby
  return (
    <Lobby
      onStartGame={(gameId, isWhite) => {
        setMultiplayerGameId(gameId)
        setIsWhitePlayer(isWhite)
        setGameMode('multiplayer')
      }}
      onPlayLocal={() => setGameMode('local')}
    />
  )
}
