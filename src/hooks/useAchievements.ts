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
 * Hook to manage achievement system with persistent storage
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

  // Load achievements from database
  useEffect(() => {
    if (!user) return;
    
    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        
        // Get saved achievements from database
        const { data: savedAchievements } = await supabase
          .from('player_achievements')
          .select('*')
          .eq('user_id', user.id);

        // Merge with base achievements
        const mergedAchievements: Achievement[] = baseAchievements.map(baseAchievement => {
          const saved = savedAchievements?.find(s => s.achievement_name === baseAchievement.name);
          
          return {
            id: saved?.id || `temp-${baseAchievement.name}`,
            name: baseAchievement.name,
            description: baseAchievement.description,
            category: baseAchievement.category,
            target: baseAchievement.target,
            reward_coins: baseAchievement.reward_coins,
            reward_gems: baseAchievement.reward_gems,
            emoji: baseAchievement.emoji,
            progress: saved?.progress || 0,
            completed: saved?.completed || false,
            unlocked_at: saved?.completed_at || undefined
          };
        });

        setAchievements(mergedAchievements);
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievements();
  }, [user]);

  // Check achievement progress with database persistence
  const checkAchievementProgress = async (garden: any) => {
    if (!user || !garden) return;

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

      // Check existing achievement from database to prevent duplicates
      const { data: existingAchievement } = await supabase
        .from('player_achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('achievement_name', baseAchievement.name)
        .single();

      // If achievement should be completed and isn't already completed
      if (currentProgress >= baseAchievement.target && !existingAchievement?.completed) {
        await completeAchievement(baseAchievement, currentProgress);
      } else if (existingAchievement && !existingAchievement.completed) {
        // Update progress without completing
        await supabase
          .from('player_achievements')
          .update({ progress: currentProgress })
          .eq('user_id', user.id)
          .eq('achievement_name', baseAchievement.name);
      } else if (!existingAchievement) {
        // Create new achievement record
        await supabase
          .from('player_achievements')
          .insert({
            user_id: user.id,
            achievement_name: baseAchievement.name,
            achievement_category: baseAchievement.category,
            progress: currentProgress,
            target: baseAchievement.target,
            completed: currentProgress >= baseAchievement.target
          });
      }
    }
  };

  const completeAchievement = async (achievement: Omit<Achievement, 'id' | 'progress' | 'completed' | 'unlocked_at'>, progress: number) => {
    try {
      // Use upsert to prevent duplicates
      const { error: achievementError } = await supabase
        .from('player_achievements')
        .upsert({
          user_id: user!.id,
          achievement_name: achievement.name,
          achievement_category: achievement.category,
          progress: progress,
          target: achievement.target,
          completed: true,
          completed_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id,achievement_name',
          ignoreDuplicates: false 
        });

      if (achievementError) {
        console.error('Error saving achievement:', achievementError);
        return;
      }

      // Get current values and award rewards
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins, gems')
        .eq('user_id', user!.id)
        .single();
        
      if (garden) {
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

        // Update local state
        setAchievements(prev => prev.map(a => 
          a.name === achievement.name 
            ? { ...a, completed: true, progress: progress, unlocked_at: new Date().toISOString() }
            : a
        ));
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