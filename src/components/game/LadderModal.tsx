import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Coins, Crown, Star, TrendingUp, Medal, Award } from 'lucide-react';
import { useLadder } from '@/hooks/useLadder';
import { Skeleton } from '@/components/ui/skeleton';
interface LadderModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export const LadderModal = ({
  isOpen,
  onClose
}: LadderModalProps) => {
  const [activeTab, setActiveTab] = useState('harvests');
  const {
    harvestLeaders,
    coinsLeaders,
    prestigeLeaders,
    levelLeaders,
    loading,
    currentUserRanks
  } = useLadder();
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-gray-600">#{rank}</span>;
    }
  };
  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default:
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800';
    }
  };
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };
  const LeaderboardCard = ({
    player,
    rank,
    value,
    icon,
    suffix = '',
    nextPlayerValue
  }: {
    player: any;
    rank: number;
    value: number;
    icon: React.ReactNode;
    suffix?: string;
    nextPlayerValue?: number;
  }) => {
    const difference = nextPlayerValue ? nextPlayerValue - value : 0;
    return <Card className={`transition-all duration-200 hover:shadow-md ${rank <= 3 ? 'ring-2 ring-opacity-50' : ''} ${rank === 1 ? 'ring-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100' : rank === 2 ? 'ring-gray-400 bg-gradient-to-r from-gray-50 to-gray-100' : rank === 3 ? 'ring-amber-400 bg-gradient-to-r from-amber-50 to-amber-100' : 'bg-white'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8">
                {getRankIcon(rank)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {player.username || 'Jardinier Anonyme'}
                </p>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  {icon}
                  <span>{formatNumber(value)}{suffix}</span>
                </div>
                {difference > 0 && rank > 1}
              </div>
            </div>
            <Badge className={getRankBadgeColor(rank)}>
              #{rank}
            </Badge>
          </div>
        </CardContent>
      </Card>;
  };
  const LoadingSkeleton = () => <div className="space-y-3">
      {[...Array(10)].map((_, i) => <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>)}
    </div>;
  const CurrentUserRank = ({
    category
  }: {
    category: string;
  }) => {
    const rank = currentUserRanks[category];
    if (!rank) return null;
    return <Card className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Votre position</span>
            </div>
            <Badge className="bg-green-600 text-white">
              #{rank.rank}
            </Badge>
          </div>
        </CardContent>
      </Card>;
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-purple-800 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Classement des Jardiniers
          </DialogTitle>
          <p className="text-purple-600 text-sm">
            Découvrez les meilleurs jardiniers dans chaque catégorie
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-white/50">
            <TabsTrigger value="harvests" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Récoltes
            </TabsTrigger>
            <TabsTrigger value="coins" className="text-xs">
              <Coins className="h-3 w-3 mr-1" />
              Pièces
            </TabsTrigger>
            <TabsTrigger value="prestige" className="text-xs">
              <Crown className="h-3 w-3 mr-1" />
              Prestige
            </TabsTrigger>
            <TabsTrigger value="level" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              Niveau
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 min-h-0">
            <TabsContent value="harvests" className="h-full m-0">
              <CurrentUserRank category="harvests" />
              <ScrollArea className="h-[calc(100%-4rem)]">
                <div className="pr-4">
                  {loading ? <LoadingSkeleton /> : <div className="space-y-2 pb-4">
                       {harvestLeaders.map((player, index) => <LeaderboardCard key={player.user_id || player.id} player={player} rank={index + 1} value={player.total_harvests} icon={<TrendingUp className="h-3 w-3 text-green-600" />} suffix=" récoltes" nextPlayerValue={index > 0 ? harvestLeaders[index - 1].total_harvests : undefined} />)}
                    </div>}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="coins" className="h-full m-0">
              <CurrentUserRank category="coins" />
              <ScrollArea className="h-[calc(100%-4rem)]">
                <div className="pr-4">
                  {loading ? <LoadingSkeleton /> : <div className="space-y-2 pb-4">
                       {coinsLeaders.map((player, index) => <LeaderboardCard key={player.user_id || player.id} player={player} rank={index + 1} value={player.coins} icon={<Coins className="h-3 w-3 text-yellow-600" />} suffix=" 🪙" nextPlayerValue={index > 0 ? coinsLeaders[index - 1].coins : undefined} />)}
                    </div>}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="prestige" className="h-full m-0">
              <CurrentUserRank category="prestige" />
              <ScrollArea className="h-[calc(100%-4rem)]">
                <div className="pr-4">
                  {loading ? <LoadingSkeleton /> : <div className="space-y-2 pb-4">
                       {prestigeLeaders.map((player, index) => <LeaderboardCard key={player.user_id || player.id} player={player} rank={index + 1} value={player.prestige_level || 0} icon={<Crown className="h-3 w-3 text-purple-600" />} suffix=" prestige" nextPlayerValue={index > 0 ? prestigeLeaders[index - 1].prestige_level || 0 : undefined} />)}
                    </div>}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="level" className="h-full m-0">
              <CurrentUserRank category="level" />
              <ScrollArea className="h-[calc(100%-4rem)]">
                <div className="pr-4">
                  {loading ? <LoadingSkeleton /> : <div className="space-y-2 pb-4">
                       {levelLeaders.map((player, index) => <LeaderboardCard key={player.user_id || player.id} player={player} rank={index + 1} value={player.level || 1} icon={<Star className="h-3 w-3 text-blue-600" />} suffix="" nextPlayerValue={index > 0 ? levelLeaders[index - 1].level || 1 : undefined} />)}
                    </div>}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>;
};