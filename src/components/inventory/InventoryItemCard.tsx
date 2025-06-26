
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InventoryItem } from '@/hooks/useInventory';

interface InventoryItemCardProps {
  item: InventoryItem;
  onUse?: (itemId: string, plotNumber?: number) => void;
  showUseButton?: boolean;
  usingTool?: boolean;
}

export const InventoryItemCard = ({ 
  item, 
  onUse, 
  showUseButton = true,
  usingTool = false 
}: InventoryItemCardProps) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'seed': return '🌱';
      case 'tool': return '🔧';
      case 'upgrade': return '⬆️';
      default: return '📦';
    }
  };

  const canUse = item.shop_item.item_type === 'tool' || item.shop_item.item_type === 'seed';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{item.shop_item.emoji || getTypeIcon(item.shop_item.item_type)}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{item.shop_item.display_name}</h3>
            <p className="text-xs text-gray-600">Quantité: {item.quantity}</p>
          </div>
        </div>
        
        {item.shop_item.description && (
          <p className="text-xs text-gray-700 mb-3">{item.shop_item.description}</p>
        )}
        
        {showUseButton && canUse && onUse && (
          <Button
            size="sm"
            onClick={() => onUse(item.id)}
            disabled={usingTool}
            className="w-full text-xs"
            variant="outline"
          >
            {usingTool ? 'Utilisation...' : 'Utiliser'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
