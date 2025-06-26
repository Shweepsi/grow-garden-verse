
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Coins, Gem } from 'lucide-react';

interface DailyObjective {
  id: string;
  objective_type: string;
  target_value: number;
  current_progress: number;
  reward_coins: number;
  reward_gems: number;
  completed: boolean;
}

interface DailyObjectivesProps {
  objectives: DailyObjective[];
  onClaimReward?: (objectiveId: string) => void;
}

export const DailyObjectives = ({ objectives, onClaimReward }: DailyObjectivesProps) => {
  const getObjectiveTitle = (type: string) => {
    switch (type) {
      case 'harvest_plants': return 'Récolter des plantes';
      case 'water_plants': return 'Arroser des plantes';
      case 'collect_coins': return 'Collecter des pièces';
      default: return 'Objectif mystère';
    }
  };

  const getObjectiveIcon = (type: string) => {
    switch (type) {
      case 'harvest_plants': return '🌾';
      case 'water_plants': return '💧';
      case 'collect_coins': return '💰';
      default: return '🎯';
    }
  };

  if (objectives.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-gray-500">Aucun objectif quotidien disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Objectifs quotidiens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {objectives.map((objective) => (
          <div key={objective.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getObjectiveIcon(objective.objective_type)}</span>
                <span className="text-sm font-medium">
                  {getObjectiveTitle(objective.objective_type)}
                </span>
              </div>
              <span className="text-xs text-gray-600">
                {objective.current_progress}/{objective.target_value}
              </span>
            </div>
            
            <Progress 
              value={(objective.current_progress / objective.target_value) * 100} 
              className="h-2"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                {objective.reward_coins > 0 && (
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-yellow-500" />
                    <span>{objective.reward_coins}</span>
                  </div>
                )}
                {objective.reward_gems > 0 && (
                  <div className="flex items-center gap-1">
                    <Gem className="h-3 w-3 text-purple-500" />
                    <span>{objective.reward_gems}</span>
                  </div>
                )}
              </div>
              
              {objective.completed && onClaimReward && (
                <Button 
                  size="sm" 
                  onClick={() => onClaimReward(objective.id)}
                  className="h-6 px-2 text-xs"
                >
                  Réclamer
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
