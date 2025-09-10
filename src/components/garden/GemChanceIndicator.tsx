import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const GemChanceIndicator = () => {
  const { getCompleteMultipliers } = useGameMultipliers();
  const multipliers = getCompleteMultipliers();
  const gemChance = multipliers.gemChance || 0;
  const percentage = Math.round(gemChance * 100);

  if (gemChance <= 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Card className="border-gray-300">
              <CardContent className="p-3 text-center">
                <div className="text-xl">💎</div>
                <p className="text-xs text-gray-500">0%</p>
                <p className="text-xs text-gray-400">Chance gemmes</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Achetez l'amélioration "Chercheur de Gemmes" pour avoir des chances de trouver des gemmes lors des récoltes !</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-3 text-center">
              <div className="text-xl">💎</div>
              <p className="text-sm font-bold text-purple-600">{percentage}%</p>
              <p className="text-xs text-purple-500">Chance gemmes</p>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>Vous avez {percentage}% de chance de trouver une gemme à chaque récolte.</p>
          <p className="text-xs text-gray-500 mt-1">
            Amélioration actuelle: {gemChance.toFixed(3)}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};