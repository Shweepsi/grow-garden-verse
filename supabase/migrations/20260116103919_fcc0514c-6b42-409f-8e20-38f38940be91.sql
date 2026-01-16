-- Supprimer la policy publique
DROP POLICY IF EXISTS "Anyone can view system configs" ON public.system_configs;

-- Créer une policy qui restreint l'accès aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can view system configs"
ON public.system_configs
FOR SELECT
TO authenticated
USING (true);