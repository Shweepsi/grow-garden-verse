
-- Supprimer la table des objectifs quotidiens
DROP TABLE IF EXISTS daily_objectives;

-- Supprimer aussi la fonction qui génère les objectifs quotidiens
DROP FUNCTION IF EXISTS generate_daily_objectives(uuid);
