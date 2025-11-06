-- =========================================
-- CONFIGURATION REALTIME POUR LA TABLE GAMES
-- =========================================

-- 1) Activer Realtime pour la table games
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- 2) Créer une fonction trigger pour notifier les changements
CREATE OR REPLACE FUNCTION notify_game_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifier via pg_notify pour les changements sur la table games
  PERFORM pg_notify(
    'game_update',
    json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'id', NEW.id,
      'current_turn', NEW.current_turn,
      'updated_at', NEW.updated_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Créer un trigger sur la table games
DROP TRIGGER IF EXISTS games_realtime_trigger ON games;
CREATE TRIGGER games_realtime_trigger
  AFTER INSERT OR UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION notify_game_update();

-- 4) Policies RLS pour realtime (messages)
-- Note: Ces policies permettent aux utilisateurs de recevoir les notifications en temps réel

-- Policy pour recevoir les messages realtime
DROP POLICY IF EXISTS "Users can receive realtime updates for their games" ON realtime.messages;
CREATE POLICY "Users can receive realtime updates for their games"
  ON realtime.messages
  FOR SELECT
  USING (true); -- Permet à tous les utilisateurs authentifiés de recevoir les updates

-- Alternative plus restrictive (optionnel) :
-- Si vous voulez que seuls les joueurs impliqués reçoivent les updates
-- Cette approche nécessiterait une logique plus complexe côté RLS

-- 5) Vérifier que Realtime est bien activé
-- Cette commande vous montrera si 'games' est dans la liste des tables Realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- =========================================
-- NOTES IMPORTANTES
-- =========================================
-- Après avoir exécuté cette query :
-- 1. Le trigger se déclenchera automatiquement à chaque UPDATE sur 'games'
-- 2. Supabase Realtime enverra les changements via WebSocket
-- 3. Votre client React recevra les updates instantanément
-- 4. Plus besoin de polling !

-- Pour tester :
-- UPDATE games SET current_turn = 'noir' WHERE id = '[votre-game-id]';
-- Vous devriez voir le changement en temps réel dans votre application
