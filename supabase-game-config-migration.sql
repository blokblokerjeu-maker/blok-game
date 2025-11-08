-- Migration SQL pour ajouter la configuration de jeu modulable
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne game_config à la table game_invitations
ALTER TABLE game_invitations 
ADD COLUMN IF NOT EXISTS game_config JSONB DEFAULT NULL;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN game_invitations.game_config IS 'Configuration personnalisée du jeu (plateau, règles, objectifs)';

-- 2. Ajouter la colonne game_config à la table games
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS game_config JSONB DEFAULT NULL;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN games.game_config IS 'Configuration personnalisée du jeu (plateau, règles, objectifs)';

-- 3. Créer un index GIN pour les recherches dans game_config
CREATE INDEX IF NOT EXISTS idx_games_config ON games USING gin(game_config);
CREATE INDEX IF NOT EXISTS idx_invitations_config ON game_invitations USING gin(game_config);

-- 4. Ajouter une contrainte de validation pour s'assurer que game_config a la bonne structure
-- (optionnel mais recommandé pour l'intégrité des données)
ALTER TABLE games 
ADD CONSTRAINT check_game_config_structure 
CHECK (
  game_config IS NULL OR (
    game_config ? 'blokCount' AND
    game_config ? 'blokerCount' AND
    game_config ? 'movesPerTurn' AND
    game_config ? 'boardType' AND
    game_config ? 'captureGoal' AND
    (game_config->>'blokCount')::int BETWEEN 4 AND 8 AND
    (game_config->>'blokerCount')::int BETWEEN 2 AND 4 AND
    (game_config->>'movesPerTurn')::int IN (1, 2) AND
    (game_config->>'boardType') IN ('8x8', '6x8', '4x8', '8x8-no-corners') AND
    (game_config->>'captureGoal')::int BETWEEN 1 AND 8
  )
);

ALTER TABLE game_invitations 
ADD CONSTRAINT check_invitation_config_structure 
CHECK (
  game_config IS NULL OR (
    game_config ? 'blokCount' AND
    game_config ? 'blokerCount' AND
    game_config ? 'movesPerTurn' AND
    game_config ? 'boardType' AND
    game_config ? 'captureGoal' AND
    (game_config->>'blokCount')::int BETWEEN 4 AND 8 AND
    (game_config->>'blokerCount')::int BETWEEN 2 AND 4 AND
    (game_config->>'movesPerTurn')::int IN (1, 2) AND
    (game_config->>'boardType') IN ('8x8', '6x8', '4x8', '8x8-no-corners') AND
    (game_config->>'captureGoal')::int BETWEEN 1 AND 8
  )
);

-- 5. Exemple de configuration par défaut (8x8 classique)
-- Configuration par défaut pour les parties existantes (optionnel)
/*
UPDATE games 
SET game_config = '{
  "blokCount": 8,
  "blokerCount": 4,
  "movesPerTurn": 1,
  "boardType": "8x8",
  "captureGoal": 4
}'::jsonb
WHERE game_config IS NULL;
*/

-- 6. Fonction helper pour valider une configuration de jeu (optionnel)
CREATE OR REPLACE FUNCTION validate_game_config(config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    config ? 'blokCount' AND
    config ? 'blokerCount' AND
    config ? 'movesPerTurn' AND
    config ? 'boardType' AND
    config ? 'captureGoal' AND
    (config->>'blokCount')::int BETWEEN 4 AND 8 AND
    (config->>'blokerCount')::int BETWEEN 2 AND 4 AND
    (config->>'movesPerTurn')::int IN (1, 2) AND
    (config->>'boardType') IN ('8x8', '6x8', '4x8', '8x8-no-corners') AND
    (config->>'captureGoal')::int BETWEEN 1 AND 8 AND
    (config->>'captureGoal')::int <= (config->>'blokCount')::int
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Vérification de la migration
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('games', 'game_invitations') 
  AND column_name = 'game_config';
