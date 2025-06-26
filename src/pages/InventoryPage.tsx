
import { useState } from 'react';
import { GameHeader } from '@/components/game/GameHeader';
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { useInventory } from '@/hooks/useInventory';
import { Loader2 } from 'lucide-react';

export const InventoryPage = () => {
  const { gameState } = useRefactoredGame();
  const { inventoryItems, seeds, tools, upgrades, loading, useTool, usingTool } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tout', count: inventoryItems.length },
    { id: 'seed', label: 'Graines', count: seeds.length },
    { id: 'tool', label: 'Outils', count: tools.length },
    { id: 'upgrade', label: 'Améliorations', count: upgrades.length }
  ];

  const getFilteredItems = () => {
    switch (selectedCategory) {
      case 'seed': return seeds;
      case 'tool': return tools;
      case 'upgrade': return upgrades;
      default: return inventoryItems;
    }
  };

  const filteredItems = getFilteredItems();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100">
      <GameHeader garden={gameState.garden} />
      
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold text-green-800 mb-4">🎒 Inventaire</h1>
        
        {/* Category filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-green-600 border border-green-600'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>

        {/* Inventory items grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onUse={useTool}
              usingTool={usingTool}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {selectedCategory === 'all' 
                ? 'Votre inventaire est vide' 
                : selectedCategory === 'seed'
                ? 'Aucune graine dans votre inventaire. Rendez-vous dans la boutique pour en acheter !'
                : 'Aucun article dans cette catégorie'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
