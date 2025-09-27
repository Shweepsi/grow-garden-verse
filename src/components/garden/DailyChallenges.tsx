import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trophy, Clock, Gift } from 'lucide-react';

interface DailyChallenge {
  id: string;
  name: string;
  description: string;
  target: number;
  reward_coins: number;
  reward_gems: number;
  category: string;
  emoji: string;
  progress: number;
  completed: boolean;
  expires_at: string;
}

/**
 * Daily challenges system to increase engagement and provide additional gem sources
 */
export const DailyChallenges = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate daily challenges based on current date
  const generateDailyChallenges = (): Omit<DailyChallenge, 'id' | 'progress' | 'completed' | 'expires_at'>[] => {
    const today = new Date().toDateString();
    const seed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    
    // Use seed to select challenges consistently for the day
    const baseChallenges = [
      {
        name: "Récolte Matinale",
        description: "Récoltez 5 plantes",
        target: 5,
        reward_coins: 100,
        reward_gems: 1,
        category: "harvest",
        emoji: "🌅"
      },
      {
        name: "Jardinier Productif",
        description: "Plantez 10 graines",
        target: 10,
        reward_coins: 150,
        reward_gems: 1,
        category: "planting",
        emoji: "🌱"
      },
      {
        name: "Collectionneur",
        description: "Accumulez 1000 pièces",
        target: 1000,
        reward_coins: 200,
        reward_gems: 2,
        category: "wealth",
        emoji: "💰"
      },
      {
        name: "Maître du Temps",
        description: "Récoltez une plante en moins de 5 minutes",
        target: 1,
        reward_coins: 100,
        reward_gems: 1,
        category: "speed",
        emoji: "⚡"
      },
      {
        name: "Robot Optimisé",
        description: "Collectez 500 pièces du robot",
        target: 500,
        reward_coins: 150,
        reward_gems: 1,
        category: "robot",
        emoji: "🤖"
      }
    ];

    // Select 3 challenges for the day based on seed
    const selectedIndices = [];
    let currentSeed = seed;
    while (selectedIndices.length < 3) {
      const index = currentSeed % baseChallenges.length;
      if (!selectedIndices.includes(index)) {
        selectedIndices.push(index);
      }
      currentSeed = Math.floor(currentSeed / 7) + 1;
    }

    return selectedIndices.map(i => baseChallenges[i]);
  };

  const loadChallenges = async () => {
    if (!user) return;

    const dailyChallenges = generateDailyChallenges();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Get current garden data for progress calculation
    const { data: garden } = await supabase
      .from('player_gardens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!garden) return;

    const challengesWithProgress: DailyChallenge[] = dailyChallenges.map((challenge, index) => {
      let progress = 0;
      let completed = false;

      // Calculate progress based on current garden state
      switch (challenge.category) {
        case 'harvest':
          progress = Math.min(garden.total_harvests || 0, challenge.target);
          break;
        case 'wealth':
          progress = Math.min(garden.coins || 0, challenge.target);
          break;
        case 'planting':
          // This would need to be tracked separately, for now use harvest as proxy
          progress = Math.min(garden.total_harvests || 0, challenge.target);
          break;
        default:
          progress = 0;
      }

      completed = progress >= challenge.target;

      return {
        id: `daily_${new Date().toDateString()}_${index}`,
        ...challenge,
        progress,
        completed,
        expires_at: tomorrow.toISOString()
      };
    });

    setChallenges(challengesWithProgress);
    setIsLoading(false);
  };

  const claimReward = async (challenge: DailyChallenge) => {
    if (!user || !challenge.completed) return;

    try {
      const { data: garden } = await supabase
        .from('player_gardens')
        .select('coins, gems')
        .eq('user_id', user.id)
        .single();

      if (!garden) return;

      await supabase
        .from('player_gardens')
        .update({
          coins: (garden.coins || 0) + challenge.reward_coins,
          gems: (garden.gems || 0) + challenge.reward_gems
        })
        .eq('user_id', user.id);

      // Mark as claimed locally
      setChallenges(prev => prev.map(c => 
        c.id === challenge.id ? { ...c, completed: false } : c
      ));

      toast.success(`🎉 Défi terminé !`, {
        description: `+${challenge.reward_coins} pièces, +${challenge.reward_gems} gemmes`
      });

    } catch (error) {
      console.error('Error claiming challenge reward:', error);
      toast.error('Erreur lors de la réclamation de la récompense');
    }
  };

  useEffect(() => {
    loadChallenges();
  }, [user]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Défis Quotidiens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement des défis...</div>
        </CardContent>
      </Card>
    );
  }

  const timeToReset = () => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const hours = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
    const minutes = Math.floor(((tomorrow.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Défis Quotidiens
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Renouvellement dans {timeToReset()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.map((challenge) => (
          <div key={challenge.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{challenge.emoji}</span>
                <div>
                  <h4 className="font-medium">{challenge.name}</h4>
                  <p className="text-sm text-muted-foreground">{challenge.description}</p>
                </div>
              </div>
              {challenge.completed ? (
                <Button 
                  size="sm" 
                  onClick={() => claimReward(challenge)}
                  className="flex items-center gap-1"
                >
                  <Gift className="h-4 w-4" />
                  Réclamer
                </Button>
              ) : (
                <Badge variant="outline">
                  {challenge.progress}/{challenge.target}
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={(challenge.progress / challenge.target) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Récompense:</span>
                <span>{challenge.reward_coins} 🪙 + {challenge.reward_gems} 💎</span>
              </div>
            </div>
          </div>
        ))}
        
        {challenges.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun défi disponible pour aujourd'hui
          </div>
        )}
      </CardContent>
    </Card>
  );
};