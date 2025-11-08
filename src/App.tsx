import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { Lobby } from './components/Lobby'
import { MultiplayerGame } from './components/MultiplayerGame'
import LocalGame from './LocalGame'
import { BotGame } from './components/BotGame'
import { GameSettingsScreen } from './components/GameSettingsScreen'
import { GameRules } from './components/GameRules'
import type { PlayerColor } from './bot/GameEngine'
import type { GameConfig } from './types/GameConfig'
import { DEFAULT_CONFIG } from './types/GameConfig'

type GameMode = 'lobby' | 'local' | 'local-settings' | 'multiplayer' | 'multiplayer-settings' | 'bot' | 'bot-settings' | 'rules'

export default function App() {
  const { user, loading } = useAuth()
  const [gameMode, setGameMode] = useState<GameMode>('lobby')
  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(null)
  const [isWhitePlayer, setIsWhitePlayer] = useState(false)
  const [botPlayerColor, setBotPlayerColor] = useState<PlayerColor | null>(null)
  const [localGameConfig, setLocalGameConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [botGameConfig, setBotGameConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [multiplayerGameConfig, setMultiplayerGameConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [pendingInvitationUserId, setPendingInvitationUserId] = useState<string | null>(null)

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
  
  // Page des règles
  if (gameMode === 'rules') {
    return <GameRules onBack={() => setGameMode('lobby')} />
  }
  
  // Configuration pour jeu multijoueur
  if (gameMode === 'multiplayer-settings') {
    return (
      <GameSettingsScreen
        title="🌐 Jeu en Ligne - Configuration"
        onStartGame={(config) => {
          setMultiplayerGameConfig(config)
          setGameMode('lobby')
          // L'invitation sera envoyée automatiquement dans le Lobby
          // Puis on réinitialise après un court délai
          setTimeout(() => setPendingInvitationUserId(null), 1000)
        }}
        onBack={() => {
          setGameMode('lobby')
          setPendingInvitationUserId(null)
        }}
      />
    )
  }
  
  // Configuration pour jeu local
  if (gameMode === 'local-settings') {
    return (
      <GameSettingsScreen
        title="Jeu Local - Configuration"
        onStartGame={(config) => {
          setLocalGameConfig(config)
          setGameMode('local')
        }}
        onBack={() => setGameMode('lobby')}
      />
    )
  }

  if (gameMode === 'local') {
    return (
      <LocalGame 
        config={localGameConfig}
        onBack={() => {
          setGameMode('lobby')
          setLocalGameConfig(DEFAULT_CONFIG)
        }} 
      />
    )
  }

  // Configuration pour jeu contre le bot
  if (gameMode === 'bot-settings') {
    return (
      <GameSettingsScreen
        title="🤖 Jouer contre le Bot - Configuration"
        onStartGame={(config) => {
          setBotGameConfig(config)
          setGameMode('bot')
        }}
        onBack={() => setGameMode('lobby')}
      />
    )
  }

  if (gameMode === 'bot') {
    if (!botPlayerColor) {
      // Écran de sélection de couleur
      return (
        <div className="game-container">
          <div className="color-selection">
            <h1 className="game-title">🤖 Jouer contre le Bot</h1>
            <p className="color-selection-text">Choisissez votre couleur :</p>
            <div className="color-buttons">
              <button 
                className="color-button white"
                onClick={() => setBotPlayerColor('blanc')}
              >
                <span className="color-icon">⚪</span>
                <span>Jouer Blanc</span>
                <span className="color-note">(Vous commencez)</span>
              </button>
              <button 
                className="color-button black"
                onClick={() => setBotPlayerColor('noir')}
              >
                <span className="color-icon">⚫</span>
                <span>Jouer Noir</span>
                <span className="color-note">(Bot commence)</span>
              </button>
            </div>
            <button className="back-button" onClick={() => {
              setGameMode('bot-settings')
              setBotGameConfig(DEFAULT_CONFIG)
            }}>
              ← Retour
            </button>
          </div>
        </div>
      )
    }
    return (
      <BotGame 
        playerColor={botPlayerColor}
        config={botGameConfig}
        onBack={() => {
          setBotPlayerColor(null)
          setBotGameConfig(DEFAULT_CONFIG)
          setGameMode('lobby')
        }} 
      />
    )
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
      onPlayLocal={() => setGameMode('local-settings')}
      onPlayBot={() => setGameMode('bot-settings')}
      onShowRules={() => setGameMode('rules')}
      onInvitePlayer={(userId) => {
        setPendingInvitationUserId(userId)
        setGameMode('multiplayer-settings')
      }}
      multiplayerGameConfig={multiplayerGameConfig}
      pendingInvitationUserId={pendingInvitationUserId}
    />
  )
}
