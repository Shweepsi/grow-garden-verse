import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Gift, Sparkles } from 'lucide-react';

interface PremiumAdRewardCardProps {
  onClaim: () => void;
  loading?: boolean;
}

export const PremiumAdRewardCard = ({ onClaim, loading = false }: PremiumAdRewardCardProps) => {
  return (
    <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-50/50 to-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-yellow-600" />
          <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Premium Rewards
          </span>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 ml-auto">
            Sans pub
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center p-4 rounded-lg bg-gradient-to-r from-yellow-100/50 to-orange-100/50 border border-yellow-200/50">
          <Crown className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <h3 className="font-semibold text-yellow-800 mb-1">
            Récompenses Automatiques
          </h3>
          <p className="text-sm text-yellow-700">
            En tant qu'utilisateur premium, vous recevez automatiquement les récompenses sans regarder de publicités !
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-lg bg-white/50 border border-yellow-200/30">
            <div className="text-lg font-bold text-yellow-600">50 💰</div>
            <div className="text-xs text-yellow-700">Pièces bonus</div>
          </div>
          <div className="p-3 rounded-lg bg-white/50 border border-yellow-200/30">
            <div className="text-lg font-bold text-yellow-600">×2 🚀</div>
            <div className="text-xs text-yellow-700">Boost croissance</div>
          </div>
        </div>

        <Button 
          onClick={onClaim}
          disabled={loading}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Attribution...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Recevoir les récompenses
            </>
          )}
        </Button>

        <p className="text-xs text-center text-yellow-600">
          🎉 Merci de soutenir le développement du jeu !
        </p>
      </CardContent>
    </Card>
  );
};