import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  target: number;
  reward_coins: number;
  reward_gems: number;
  emoji: string;
  progress?: number;
  completed?: boolean;
  unlocked_at?: string;
}

/**
 * Hook to manage achievement system
 */
export const useAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Define base achievements
  const baseAchievements: Omit<Achievement, 'id' | 'progress' | 'completed' | 'unlocked_at'>[] = [
    {
      name: "Premier Pas",
      description: "Plantez votre première graine",
      category: "planting",
      target: 1,
      reward_coins: 50,
      reward_gems: 1,
      emoji: "🌱"
    },
    {
      name: "Jardinier Débutant",
      description: "Récoltez 10 plantes",
      category: "harvest",
      target: 10,
      reward_coins: 200,
      reward_gems: 2,
      emoji: "🌿"
    },
    {
      name: "Maître du Jardin",
      description: "Récoltez 100 plantes",
      category: "harvest",
      target: 100,
      reward_coins: 1000,
      reward_gems: 5,
      emoji: "🌳"
    },
    {
      name: "Collectionneur de Pièces",
      description: "Accumulez 10,000 pièces",
      category: "wealth",
      target: 10000,
      reward_coins: 500,
      reward_gems: 3,
      emoji: "🪙"
    },
    {
      name: "Millionaire",
      description: "Accumulez 100,000 pièces",
      category: "wealth",
      target: 100000,
      reward_coins: 5000,
      reward_gems: 10,
      emoji: "💰"
    },
    {
      name: "Premier Prestige",
      description: "Effectuez votre premier prestige",
      category: "prestige",
      target: 1,
      reward_coins: 1000,
      reward_gems: 15,
      emoji: "👑"
    },
    {
      name: "Maître du Prestige",
      description: "Atteignez le prestige niveau 3",
      category: "prestige",
      target: 3,
      reward_coins: 10000,
      reward_gems: 50,
      emoji: "🏆"
    }
  ];

  // Check achievement progress
  const checkAchievementProgress = async (garden: any) => {
    if (!user || !garden) return;

    const updates: any[] = [];
    
    for (const baseAchievement of baseAchievements) {
      let currentProgress = 0;
      
      switch (baseAchievement.category) {
        case 'harvest':
          currentProgress = garden.total_harvests || 0;
          break;
        case 'wealth':
          currentProgress = garden.coins || 0;
          break;
        case 'prestige':
          currentProgress = garden.prestige_level || 0;
          break;
        case 'planting':
          currentProgress = garden.total_harvests > 0 ? 1 : 0;
          break;
      }

      // Check if achievement should be completed
      if (currentProgress >= baseAchievement.target) {
        // Check if already completed
        const existingAchievement = achievements.find(a => a.name === baseAchievement.name);
        if (!existingAchievement?.completed) {
          updates.push({
            achievement: baseAchievement,
            progress: currentProgress
          });
        }
      }
    }

    // Process completed achievements
    for (const update of updates) {
      await completeAchievement(update.achievement, update.progress);
    }
  };

  const completeAchievement = async (achievement: Omit<Achievement, 'id' | 'progress' | 'completed' | 'unlocked_at'>, progress: number) => {
    try {
      // Get current values first
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins, gems')
        .eq('user_id', user!.id)
        .single();
        
      if (garden) {
        // Award rewards
        await supabase
          .from('player_gardens')
          .update({
            coins: (garden.coins || 0) + achievement.reward_coins,
            gems: (garden.gems || 0) + achievement.reward_gems
          })
          .eq('user_id', user!.id);

        toast.success(`🏆 Achievement débloqué : ${achievement.emoji} ${achievement.name}`, {
          description: `+${achievement.reward_coins} pièces, +${achievement.reward_gems} gemmes`
        });
      }

    } catch (error) {
      console.error('Error completing achievement:', error);
    }
  };

  return {
    achievements,
    isLoading,
    checkAchievementProgress
  };
};