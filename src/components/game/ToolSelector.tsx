
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ShopItem } from '@/hooks/useShop';
import { Coins, Wrench } from 'lucide-react';

interface ToolSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  plotNumber: number;
  tools: ShopItem[];
  coins: number;
  onApplyTool: (plotNumber: number, toolId: string, cost: number) => void;
}

export const ToolSelector = ({ 
  isOpen, 
  onClose, 
  plotNumber, 
  tools,
  coins,
  onApplyTool
}: ToolSelectorProps) => {
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyTool = async (tool: ShopItem) => {
    if (coins < tool.price) return;

    setIsApplying(true);
    try {
      await onApplyTool(plotNumber, tool.id, tool.price);
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'application de l\'outil:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return 'border-purple-500 bg-purple-50';
      case 'legendary': return 'border-yellow-500 bg-yellow-50';
      case 'epic': return 'border-purple-400 bg-purple-50';
      case 'rare': return 'border-blue-400 bg-blue-50';
      case 'uncommon': return 'border-green-400 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            Appliquer un outil - Parcelle {plotNumber}
            <div className="ml-auto flex items-center gap-1 text-sm text-yellow-600">
              <Coins className="h-4 w-4" />
              {coins.toLocaleString()}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool) => {
            const canAfford = coins >= tool.price;

            return (
              <Card
                key={tool.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${getRarityColor(tool.rarity)}`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tool.emoji}</span>
                      <div>
                        <h4 className="font-medium">{tool.display_name}</h4>
                        <p className="text-sm text-gray-600">{tool.description}</p>
                      </div>
                    </div>

                    <div className={`font-bold text-sm flex items-center gap-1 ${
                      canAfford ? 'text-green-600' : 'text-red-500'
                    }`}>
                      <Coins className="h-3 w-3" />
                      {tool.price.toLocaleString()}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleApplyTool(tool)}
                      disabled={!canAfford || isApplying}
                      className={`w-full ${
                        canAfford 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-400'
                      }`}
                    >
                      {isApplying ? 'Application...' : 'Appliquer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {tools.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600 mb-2">Aucun outil disponible</p>
              <p className="text-sm text-gray-500">
                Visitez la boutique pour acheter des outils !
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
