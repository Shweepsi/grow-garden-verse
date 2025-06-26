
import { useState } from 'react';
import { GameHeader } from '@/components/game/GameHeader';
import { ShopItemCard } from '@/components/shop/ShopItemCard';
import { useSimpleGame } from '@/hooks/useSimpleGame';
import { useShop } from '@/hooks/useShop';
import { Loader2 } from 'lucide-react';

export const ShopPage = () => {
  const { gameState } = useSimpleGame();
  const { shopItems, loading, purchaseItem, purchasing } = useShop();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tout' },
    { id: 'seed', label: 'Graines' },
    { id: 'tool', label: 'Outils' },
    { id: 'upgrade', label: 'Améliorations' }
  ];

  const filteredItems = selectedCategory === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.item_type === selectedCategory);

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
        <h1 className="text-2xl font-bold text-green-800 mb-4">🛒 Boutique</h1>
        
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
              {category.label}
            </button>
          ))}
        </div>

        {/* Shop items grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <ShopItemCard
              key={item.id}
              item={item}
              onPurchase={purchaseItem}
              canAfford={(gameState.garden?.coins || 0) >= item.price}
              purchasing={purchasing}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Aucun article dans cette catégorie</p>
          </div>
        )}
      </div>
    </div>
  );
};
