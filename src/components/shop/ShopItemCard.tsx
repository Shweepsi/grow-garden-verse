
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShopItem } from '@/hooks/useShop';

interface ShopItemCardProps {
  item: ShopItem;
  onPurchase: (itemId: string) => void;
  canAfford: boolean;
  purchasing: boolean;
}

export const ShopItemCard = ({ item, onPurchase, canAfford, purchasing }: ShopItemCardProps) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300';
      case 'uncommon': return 'border-green-400';
      case 'rare': return 'border-blue-400';
      case 'legendary': return 'border-purple-400';
      case 'special': return 'border-yellow-400';
      default: return 'border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'seed': return '🌱';
      case 'tool': return '🔧';
      case 'upgrade': return '⬆️';
      default: return '📦';
    }
  };

  return (
    <Card className={`${getRarityColor(item.rarity)} border-2 hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{item.emoji || getTypeIcon(item.item_type)}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{item.display_name}</h3>
            <p className="text-xs text-gray-600 capitalize">{item.rarity}</p>
          </div>
        </div>
        
        {item.description && (
          <p className="text-xs text-gray-700 mb-3">{item.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-green-600">
            💰 {item.price}
          </span>
          <Button
            size="sm"
            onClick={() => onPurchase(item.id)}
            disabled={!canAfford || purchasing}
            className="text-xs px-3 py-1 h-7"
          >
            {purchasing ? '...' : 'Acheter'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
