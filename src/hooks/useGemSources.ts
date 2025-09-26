import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook to manage additional gem sources (level rewards, daily objectives)
 */
export const useGemSources = () => {
  const { user } = useAuth();

  // Check for level-based gem rewards
  const checkLevelGemReward = async (newLevel: number, oldLevel: number) => {
    if (!user || newLevel <= oldLevel) return;
    
    // Award 1 gem every 5 levels
    const oldLevelMilestone = Math.floor(oldLevel / 5);
    const newLevelMilestone = Math.floor(newLevel / 5);
    
    if (newLevelMilestone > oldLevelMilestone) {
      const gemsEarned = newLevelMilestone - oldLevelMilestone;
      
      try {
        // Get current gems first
        const { data: garden } = await supabase
          .from('player_gardens')
          .select('gems')
          .eq('user_id', user.id)
          .single();
          
        if (garden) {
          const { error } = await supabase
            .from('player_gardens')
            .update({
              gems: (garden.gems || 0) + gemsEarned
            })
            .eq('user_id', user.id);
            
          if (!error) {
            toast.success(`🎉 Récompense de niveau !`, {
              description: `Vous avez gagné ${gemsEarned} gemme(s) pour avoir atteint le niveau ${newLevel} !`
            });
          }
        }
      } catch (error) {
        console.error('Error awarding level gem reward:', error);
      }
    }
  };

  return {
    checkLevelGemReward
  };
};