import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PremiumAdAutoRewardProps {
  onRewardClaimed: (rewardType: string, amount: number) => void;
  loading?: boolean;
  availableRewards?: Array<{
    type: string;
    amount: number;
    description: string;
    emoji: string;
  }>;
}

export const PremiumAdAutoReward = ({ 
  onRewardClaimed, 
  loading = false, 
  availableRewards = [] 
}: PremiumAdAutoRewardProps) => {
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);

  const handleClaimReward = async (rewardType: string, amount: number) => {
    if (claiming || loading) return;
    
    setClaiming(true);
    try {
      await onRewardClaimed(rewardType, amount);
      toast({
        title: "Récompense réclamée !",
        description: "Votre récompense premium a été ajoutée à votre compte.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la réclamation de la récompense premium",
        variant: "destructive"
      });
    } finally {
      setClaiming(false);
    }
  };

  const defaultRewards = [
    {
      type: 'coins',
      amount: 1000,
      description: 'Pièces bonus',
      emoji: '🪙'
    },
    {
      type: 'gems',
      amount: 5,
      description: 'Gemmes premium',
      emoji: '💎'
    }
  ];

  const rewards = availableRewards.length > 0 ? availableRewards : defaultRewards;

  return (
    <div className="space-y-4 p-4 border border-primary/20 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5 text-yellow-500" />
        <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 border-yellow-500/30">
          PREMIUM
        </Badge>
      </div>
      
      <h3 className="font-semibold text-foreground">Récompenses automatiques</h3>
      <p className="text-sm text-muted-foreground">
        En tant qu'utilisateur premium, réclamez vos récompenses instantanément sans publicité !
      </p>
      
      <div className="grid gap-2">
        {rewards.map((reward, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-md border">
            <div className="flex items-center gap-2">
              <span className="text-lg">{reward.emoji}</span>
              <div>
                <div className="font-medium">{reward.amount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{reward.description}</div>
              </div>
            </div>
            
            <Button
              onClick={() => handleClaimReward(reward.type, reward.amount)}
              disabled={claiming || loading}
              size="sm"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              <Gift className="h-4 w-4 mr-1" />
              {claiming ? 'Attribution...' : 'Réclamer'}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-center text-muted-foreground pt-2 border-t border-primary/10">
        Merci d'être un membre premium ! 👑
      </div>
    </div>
  );
};