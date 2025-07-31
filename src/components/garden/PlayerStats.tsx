import { Card, CardContent } from '@/components/ui/card';
import { PlayerGarden } from '@/types/game';
import { Trophy } from 'lucide-react';

interface PlayerStatsProps {
  garden: PlayerGarden | null;
}

export const PlayerStats = ({ garden }: PlayerStatsProps) => {
  if (!garden) return null;

  return (
    <div className="space-y-6">
      {/* Récoltes totales */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">
              {garden.total_harvests}
            </p>
            <p className="text-xs text-gray-600">Récoltes totales</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};