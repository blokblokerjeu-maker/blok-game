import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { GameInvitation, Game, Profile } from '../lib/supabase'

type LobbyProps = {
  onStartGame: (gameId: string, isWhite: boolean) => void
  onPlayLocal: () => void
}

export function Lobby({ onStartGame, onPlayLocal }: LobbyProps) {
  const { profile, signOut } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [invitations, setInvitations] = useState<GameInvitation[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUsers()
    loadInvitations()
    loadGames()

    // S'abonner aux changements en temps réel
    const invitationsSubscription = supabase
      .channel('invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `to_user_id=eq.${profile?.id}`,
        },
        () => {
          loadInvitations()
        }
      )
      .subscribe()

    const gamesSubscription = supabase
      .channel('games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
        },
        () => {
          loadGames()
        }
      )
      .subscribe()

    return () => {
      invitationsSubscription.unsubscribe()
      gamesSubscription.unsubscribe()
    }
  }, [profile])

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', profile?.id)
      .order('username')

    if (error) {
      console.error('Error loading users:', error)
      return
    }

    setUsers(data || [])
  }

  const loadInvitations = async () => {
    const { data, error } = await supabase
      .from('game_invitations')
      .select('*, from_user:profiles!game_invitations_from_user_id_fkey(*)')
      .eq('to_user_id', profile?.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading invitations:', error)
      return
    }

    setInvitations(data || [])
  }

  const loadGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        player_white:profiles!games_player_white_id_fkey(*),
        player_black:profiles!games_player_black_id_fkey(*)
      `)
      .or(`player_white_id.eq.${profile?.id},player_black_id.eq.${profile?.id}`)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading games:', error)
      return
    }

    setGames(data || [])
  }

  const sendInvitation = async (toUserId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('game_invitations')
        .insert({
          from_user_id: profile?.id,
          to_user_id: toUserId,
        })

      if (error) throw error
      alert('Invitation envoyée !')
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async (invitation: GameInvitation) => {
    setLoading(true)
    try {
      // Créer la partie
      const initialBoard: Record<number, string | null> = {}
      for (let i = 0; i < 64; i++) {
        initialBoard[i] = null
      }
      // Position initiale des pièces
      for (let i = 0; i < 8; i++) initialBoard[i] = 'blok-noir'
      initialBoard[10] = 'bloker-noir'
      initialBoard[11] = 'bloker-noir'
      initialBoard[12] = 'bloker-noir'
      initialBoard[13] = 'bloker-noir'
      initialBoard[50] = 'bloker-blanc'
      initialBoard[51] = 'bloker-blanc'
      initialBoard[52] = 'bloker-blanc'
      initialBoard[53] = 'bloker-blanc'
      for (let i = 56; i < 64; i++) initialBoard[i] = 'blok-blanc'

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          player_white_id: invitation.from_user_id,
          player_black_id: profile?.id,
          board_state: JSON.stringify(initialBoard),
          status: 'active',
        })
        .select()
        .single()

      if (gameError) throw gameError

      // Mettre à jour l'invitation
      const { error: invError } = await supabase
        .from('game_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      if (invError) throw invError

      // Démarrer la partie
      onStartGame(game.id, false) // L'invité joue avec les noirs
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const declineInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('game_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)

    if (error) {
      alert('Erreur : ' + error.message)
    }
  }

  const joinGame = (game: Game) => {
    const isWhite = game.player_white_id === profile?.id
    onStartGame(game.id, isWhite)
  }

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1 className="game-title">BLOK</h1>
        <div className="lobby-user-info">
          <span className="lobby-username">{profile?.username}</span>
          <button className="lobby-signout-btn" onClick={signOut}>
            Déconnexion
          </button>
        </div>
      </div>

      <div className="lobby-content">
        {/* Bouton partie locale */}
        <div className="lobby-section">
          <button className="play-local-btn" onClick={onPlayLocal}>
            🎮 Jouer en local
          </button>
        </div>

        {/* Parties en cours */}
        {games.length > 0 && (
          <div className="lobby-section">
            <h2 className="lobby-section-title">Mes parties</h2>
            <div className="lobby-list">
              {games.map((game) => (
                <div key={game.id} className="lobby-item">
                  <div className="lobby-item-info">
                    <strong>
                      {game.player_white?.username} (⚪) vs{' '}
                      {game.player_black?.username} (⚫)
                    </strong>
                    <span className="lobby-item-status">
                      {game.status === 'waiting' ? 'En attente...' : 'En cours'}
                    </span>
                  </div>
                  <button
                    className="lobby-action-btn primary"
                    onClick={() => joinGame(game)}
                  >
                    Rejoindre
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invitations reçues */}
        {invitations.length > 0 && (
          <div className="lobby-section">
            <h2 className="lobby-section-title">
              Invitations ({invitations.length})
            </h2>
            <div className="lobby-list">
              {invitations.map((inv) => (
                <div key={inv.id} className="lobby-item">
                  <div className="lobby-item-info">
                    <strong>{inv.from_user?.username}</strong> vous invite à jouer
                  </div>
                  <div className="lobby-item-actions">
                    <button
                      className="lobby-action-btn primary"
                      onClick={() => acceptInvitation(inv)}
                      disabled={loading}
                    >
                      Accepter
                    </button>
                    <button
                      className="lobby-action-btn secondary"
                      onClick={() => declineInvitation(inv.id)}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des joueurs */}
        <div className="lobby-section">
          <h2 className="lobby-section-title">Inviter un joueur</h2>
          <input
            type="text"
            placeholder="Rechercher un joueur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="lobby-search"
          />
          <div className="lobby-list">
            {filteredUsers.map((user) => (
              <div key={user.id} className="lobby-item">
                <div className="lobby-item-info">
                  <strong>{user.username}</strong>
                </div>
                <button
                  className="lobby-action-btn primary"
                  onClick={() => sendInvitation(user.id)}
                  disabled={loading}
                >
                  Inviter
                </button>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="lobby-empty">Aucun joueur trouvé</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
