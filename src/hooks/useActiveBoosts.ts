
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface ActiveBoost {
  id: string
  effect_type: string
  effect_value: number
  expires_at: string
  created_at: string
  source: string
}

export const useActiveBoosts = () => {
  const { user } = useAuth()
  const [boosts, setBoosts] = useState<ActiveBoost[]>([])
  const [loading, setLoading] = useState(false)

  const fetchActiveBoosts = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Nettoyer les boosts expirés
      await supabase.rpc('cleanup_expired_effects')

      // Récupérer les boosts actifs
      const { data, error } = await supabase
        .from('active_effects')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching active boosts:', error)
        return
      }

      setBoosts(data || [])
    } catch (error) {
      console.error('Error in fetchActiveBoosts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveBoosts()
  }, [user?.id])

  // Actualiser toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(fetchActiveBoosts, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  const getBoostMultiplier = (effectType: string): number => {
    // Support des alias : traiter 'growth_speed' et 'growth_boost' comme identiques
    const equivalentTypes = effectType === 'growth_speed'
      ? ['growth_speed', 'growth_boost']
      : effectType === 'growth_boost'
        ? ['growth_boost', 'growth_speed']
        : [effectType]

    const boost = boosts.find(b => equivalentTypes.includes(b.effect_type))
    return boost ? boost.effect_value : 1
  }

  const hasActiveBoost = (effectType: string): boolean => {
    const equivalentTypes = effectType === 'growth_speed'
      ? ['growth_speed', 'growth_boost']
      : effectType === 'growth_boost'
        ? ['growth_boost', 'growth_speed']
        : [effectType]

    return boosts.some(b => equivalentTypes.includes(b.effect_type))
  }

  const getTimeRemaining = (expiresAt: string): number => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  }

  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // Écouter les changements globaux pour rafraîchir après les récompenses
  useEffect(() => {
    const handleBoostUpdate = () => {
      fetchActiveBoosts();
    };

    // Écouter les événements personnalisés si nécessaire
    window.addEventListener('boostUpdated', handleBoostUpdate);
    
    return () => window.removeEventListener('boostUpdated', handleBoostUpdate);
  }, [user?.id]);

  return {
    boosts,
    loading,
    refreshBoosts: fetchActiveBoosts,
    getBoostMultiplier,
    hasActiveBoost,
    getTimeRemaining,
    formatTimeRemaining
  }
}
