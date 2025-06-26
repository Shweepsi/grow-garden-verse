
import { Coins, Sprout, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { PlayerGarden } from '@/types/game';

interface GameHeaderProps {
  garden: PlayerGarden | null;
}

export const GameHeader = ({ garden }: GameHeaderProps) => {
  const { signOut } = useAuth();

  return (
    <div className="bg-white shadow-sm border-b p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Sprout className="h-6 w-6 text-green-600" />
            <span className="text-lg font-bold text-green-800">Grow Garden</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 bg-yellow-100 px-3 py-1 rounded-full">
            <Coins className="h-4 w-4 text-yellow-600" />
            <span className="font-semibold text-yellow-800">{garden?.coins || 0}</span>
          </div>
          
          <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
            <Trophy className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-800">{garden?.total_harvests || 0}</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={signOut}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  );
};
