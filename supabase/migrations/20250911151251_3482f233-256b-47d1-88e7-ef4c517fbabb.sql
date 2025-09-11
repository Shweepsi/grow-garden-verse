-- Supprimer l'utilisateur shweepsi@gmail.com et toutes ses données associées
-- L'ID de l'utilisateur est: 6991d0e1-9bd0-48a0-bd5e-92972f592efa

-- Supprimer d'abord toutes les données liées dans les tables publiques
DELETE FROM public.active_effects WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.ad_cooldowns WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.ad_sessions WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.coin_transactions WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.garden_plots WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.pending_ad_rewards WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.plant_discoveries WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.player_gardens WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.player_upgrades WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.purchases WHERE user_id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';
DELETE FROM public.profiles WHERE id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';

-- Enfin, supprimer l'utilisateur de auth.users (ceci supprimera automatiquement les données auth liées)
DELETE FROM auth.users WHERE id = '6991d0e1-9bd0-48a0-bd5e-92972f592efa';