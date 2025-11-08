-- ============================================
-- Schéma Supabase pour le Bot BLOK
-- ============================================
-- Ce fichier contient les tables nécessaires pour :
-- 1. Sauvegarder les parties d'entraînement
-- 2. Stocker les poids des agents
-- 3. Créer un mode "bot en ligne"

-- ============================================
-- Table : bot_training_games
-- Stocke les parties d'entraînement du bot
-- ============================================
CREATE TABLE IF NOT EXISTS bot_training_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_number INTEGER NOT NULL,
  winner TEXT CHECK (winner IN ('blanc', 'noir', 'draw')),
  moves INTEGER NOT NULL CHECK (moves > 0),
  captures_white INTEGER NOT NULL DEFAULT 0,
  captures_black INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  training_session_id UUID,
  move_history JSONB, -- Historique complet des mouvements
  final_state JSONB,  -- État final du plateau
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour rechercher rapidement par session
CREATE INDEX idx_bot_games_session ON bot_training_games(training_session_id);
CREATE INDEX idx_bot_games_created ON bot_training_games(created_at DESC);

-- ============================================
-- Table : bot_training_sessions
-- Métadonnées des sessions d'entraînement
-- ============================================
CREATE TABLE IF NOT EXISTS bot_training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  num_games INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  config JSONB, -- Configuration de l'entraînement
  stats JSONB,  -- Statistiques finales
  status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table : bot_agents
-- Stocke les différentes versions des agents
-- ============================================
CREATE TABLE IF NOT EXISTS bot_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  color TEXT CHECK (color IN ('blanc', 'noir')) NOT NULL,
  weights JSONB NOT NULL,
  config JSONB,
  games_played INTEGER DEFAULT 0,
  exploration_rate REAL,
  training_session_id UUID REFERENCES bot_training_sessions(id),
  elo_rating INTEGER DEFAULT 1200, -- Pour classement futur
  is_active BOOLEAN DEFAULT false, -- Agent actif pour le mode en ligne
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Index pour trouver l'agent actif
CREATE INDEX idx_bot_agents_active ON bot_agents(color, is_active) WHERE is_active = true;

-- ============================================
-- Table : bot_matches (mode en ligne)
-- Parties jouées par les joueurs contre le bot
-- ============================================
CREATE TABLE IF NOT EXISTS bot_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID, -- ID du joueur (si authentifié)
  player_color TEXT CHECK (player_color IN ('blanc', 'noir')) NOT NULL,
  bot_agent_id UUID REFERENCES bot_agents(id) NOT NULL,
  winner TEXT CHECK (winner IN ('blanc', 'noir', 'draw')),
  moves INTEGER NOT NULL,
  captures_white INTEGER NOT NULL DEFAULT 0,
  captures_black INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  move_history JSONB,
  player_rating_before INTEGER,
  player_rating_after INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les stats des joueurs
CREATE INDEX idx_bot_matches_player ON bot_matches(player_id);
CREATE INDEX idx_bot_matches_created ON bot_matches(created_at DESC);

-- ============================================
-- Table : bot_agent_stats
-- Statistiques agrégées des agents
-- ============================================
CREATE TABLE IF NOT EXISTS bot_agent_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES bot_agents(id) NOT NULL,
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  avg_moves REAL,
  avg_captures REAL,
  win_rate REAL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id)
);

-- ============================================
-- Fonction : Mettre à jour les stats d'un agent
-- ============================================
CREATE OR REPLACE FUNCTION update_bot_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer ou mettre à jour les stats
  INSERT INTO bot_agent_stats (agent_id, total_matches, wins, losses, draws)
  VALUES (
    NEW.bot_agent_id,
    1,
    CASE WHEN NEW.winner = (SELECT color FROM bot_agents WHERE id = NEW.bot_agent_id) THEN 1 ELSE 0 END,
    CASE WHEN NEW.winner != (SELECT color FROM bot_agents WHERE id = NEW.bot_agent_id) AND NEW.winner IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.winner IS NULL OR NEW.winner = 'draw' THEN 1 ELSE 0 END
  )
  ON CONFLICT (agent_id) DO UPDATE
  SET
    total_matches = bot_agent_stats.total_matches + 1,
    wins = bot_agent_stats.wins + CASE WHEN NEW.winner = (SELECT color FROM bot_agents WHERE id = NEW.bot_agent_id) THEN 1 ELSE 0 END,
    losses = bot_agent_stats.losses + CASE WHEN NEW.winner != (SELECT color FROM bot_agents WHERE id = NEW.bot_agent_id) AND NEW.winner IS NOT NULL THEN 1 ELSE 0 END,
    draws = bot_agent_stats.draws + CASE WHEN NEW.winner IS NULL OR NEW.winner = 'draw' THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement les stats
CREATE TRIGGER trigger_update_bot_stats
AFTER INSERT ON bot_matches
FOR EACH ROW
EXECUTE FUNCTION update_bot_agent_stats();

-- ============================================
-- Vues utiles
-- ============================================

-- Vue : Leaderboard des agents
CREATE OR REPLACE VIEW bot_leaderboard AS
SELECT
  a.id,
  a.name,
  a.version,
  a.color,
  a.elo_rating,
  COALESCE(s.total_matches, 0) as total_matches,
  COALESCE(s.wins, 0) as wins,
  COALESCE(s.losses, 0) as losses,
  COALESCE(s.draws, 0) as draws,
  COALESCE(s.win_rate, 0) as win_rate,
  a.created_at
FROM bot_agents a
LEFT JOIN bot_agent_stats s ON a.id = s.agent_id
ORDER BY a.elo_rating DESC, s.total_matches DESC;

-- Vue : Statistiques d'une session d'entraînement
CREATE OR REPLACE VIEW training_session_summary AS
SELECT
  s.id,
  s.name,
  s.num_games,
  COUNT(g.id) as games_completed,
  SUM(CASE WHEN g.winner = 'blanc' THEN 1 ELSE 0 END) as white_wins,
  SUM(CASE WHEN g.winner = 'noir' THEN 1 ELSE 0 END) as black_wins,
  SUM(CASE WHEN g.winner = 'draw' THEN 1 ELSE 0 END) as draws,
  AVG(g.moves) as avg_moves,
  AVG(g.duration_ms) as avg_duration_ms,
  s.status,
  s.start_time,
  s.end_time
FROM bot_training_sessions s
LEFT JOIN bot_training_games g ON s.id = g.training_session_id
GROUP BY s.id;

-- ============================================
-- Politiques RLS (Row Level Security)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE bot_training_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_agent_stats ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire les agents actifs
CREATE POLICY "Public can view active agents" ON bot_agents
  FOR SELECT USING (is_active = true);

-- Politique : Tout le monde peut lire les stats des agents
CREATE POLICY "Public can view agent stats" ON bot_agent_stats
  FOR SELECT USING (true);

-- Politique : Seuls les admins peuvent insérer des sessions d'entraînement
-- (À adapter selon votre système d'authentification)
CREATE POLICY "Admin can manage training sessions" ON bot_training_sessions
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Politique : Les joueurs peuvent voir leurs propres parties
CREATE POLICY "Users can view own matches" ON bot_matches
  FOR SELECT USING (
    player_id = auth.uid() OR player_id IS NULL
  );

-- Politique : Tout le monde peut insérer des parties (pour le mode anonyme)
CREATE POLICY "Anyone can insert matches" ON bot_matches
  FOR INSERT WITH CHECK (true);

-- ============================================
-- Fonctions utiles
-- ============================================

-- Fonction : Obtenir l'agent actif pour une couleur
CREATE OR REPLACE FUNCTION get_active_bot(bot_color TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  version TEXT,
  weights JSONB,
  config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.name, a.version, a.weights, a.config
  FROM bot_agents a
  WHERE a.color = bot_color AND a.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Enregistrer une partie d'entraînement
CREATE OR REPLACE FUNCTION log_training_game(
  p_session_id UUID,
  p_game_number INTEGER,
  p_winner TEXT,
  p_moves INTEGER,
  p_captures_white INTEGER,
  p_captures_black INTEGER,
  p_duration_ms INTEGER,
  p_move_history JSONB DEFAULT NULL,
  p_final_state JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  game_id UUID;
BEGIN
  INSERT INTO bot_training_games (
    training_session_id,
    game_number,
    winner,
    moves,
    captures_white,
    captures_black,
    duration_ms,
    move_history,
    final_state
  ) VALUES (
    p_session_id,
    p_game_number,
    p_winner,
    p_moves,
    p_captures_white,
    p_captures_black,
    p_duration_ms,
    p_move_history,
    p_final_state
  )
  RETURNING id INTO game_id;

  RETURN game_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Données de test (optionnel)
-- ============================================

-- Insérer un agent de test
INSERT INTO bot_agents (name, version, color, weights, games_played, exploration_rate, is_active)
VALUES (
  'Agent Test Blanc',
  '1.0.0',
  'blanc',
  '{"blokAdvantage": 5.0, "blokerAdvantage": 3.0, "captureAdvantage": 10.0}'::jsonb,
  0,
  0.1,
  false
)
ON CONFLICT (name, version) DO NOTHING;

INSERT INTO bot_agents (name, version, color, weights, games_played, exploration_rate, is_active)
VALUES (
  'Agent Test Noir',
  '1.0.0',
  'noir',
  '{"blokAdvantage": 5.0, "blokerAdvantage": 3.0, "captureAdvantage": 10.0}'::jsonb,
  0,
  0.1,
  false
)
ON CONFLICT (name, version) DO NOTHING;

-- ============================================
-- Commentaires sur les tables
-- ============================================

COMMENT ON TABLE bot_training_games IS 'Stocke chaque partie d''entraînement du bot';
COMMENT ON TABLE bot_training_sessions IS 'Métadonnées des sessions d''entraînement';
COMMENT ON TABLE bot_agents IS 'Différentes versions des agents avec leurs poids';
COMMENT ON TABLE bot_matches IS 'Parties jouées par les utilisateurs contre le bot';
COMMENT ON TABLE bot_agent_stats IS 'Statistiques agrégées de performance des agents';

COMMENT ON COLUMN bot_agents.weights IS 'Poids JSONB de l''approximation de fonction Q-learning';
COMMENT ON COLUMN bot_agents.elo_rating IS 'Rating ELO de l''agent (pour classement futur)';
COMMENT ON COLUMN bot_agents.is_active IS 'Si true, cet agent est utilisé en production pour le mode en ligne';
