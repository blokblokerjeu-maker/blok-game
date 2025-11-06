-- Table des profils utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Table des invitations de jeu
CREATE TABLE game_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Table des parties
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_white_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  player_black_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_turn TEXT CHECK (current_turn IN ('blanc', 'noir')) DEFAULT 'blanc' NOT NULL,
  board_state TEXT NOT NULL, -- JSON stringifié du plateau
  captured_bloks_white INTEGER DEFAULT 0 NOT NULL,
  captured_bloks_black INTEGER DEFAULT 0 NOT NULL,
  last_turn_player TEXT CHECK (last_turn_player IN ('blanc', 'noir', NULL)),
  winner TEXT CHECK (winner IN ('blanc', 'noir', NULL)),
  status TEXT CHECK (status IN ('waiting', 'active', 'finished')) DEFAULT 'waiting' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX idx_game_invitations_to_user ON game_invitations(to_user_id);
CREATE INDEX idx_game_invitations_from_user ON game_invitations(from_user_id);
CREATE INDEX idx_games_player_white ON games(player_white_id);
CREATE INDEX idx_games_player_black ON games(player_black_id);
CREATE INDEX idx_games_status ON games(status);

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Profils publics en lecture" ON profiles FOR SELECT USING (true);
CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Utilisateurs peuvent insérer leur propre profil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies pour game_invitations
CREATE POLICY "Voir ses propres invitations" ON game_invitations FOR SELECT 
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Créer des invitations" ON game_invitations FOR INSERT 
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Mettre à jour ses invitations reçues" ON game_invitations FOR UPDATE 
  USING (auth.uid() = to_user_id);

-- Policies pour games
CREATE POLICY "Voir ses propres parties" ON games FOR SELECT 
  USING (auth.uid() = player_white_id OR auth.uid() = player_black_id);
CREATE POLICY "Créer des parties" ON games FOR INSERT 
  WITH CHECK (auth.uid() = player_white_id OR auth.uid() = player_black_id);
CREATE POLICY "Mettre à jour ses parties" ON games FOR UPDATE 
  USING (auth.uid() = player_white_id OR auth.uid() = player_black_id);

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer un profil automatiquement
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
