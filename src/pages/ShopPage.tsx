
import { useState } from 'react';
import { GameHeader } from '@/components/game/GameHeader';
import { ShopItemCard } from '@/components/shop/ShopItemCard';
import { useRefactoredGame } from '@/hooks/useRefactoredGame';
import { useShop } from '@/hooks/useShop';
import { Loader2, Gem } from 'lucide-react';

export const ShopPage = () => {
  const { gameState } = useRefactoredGame();
  const { shopItems, loading, purchaseItem, purchasing } = useShop();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tout' },
    { id: 'tool', label: 'Outils Premium' },
    { id: 'upgrade', label: 'Améliorations' }
  ];

  // Filtrer uniquement les articles premium (qui coûtent des gemmes ou sont premium)
  const premiumItems = shopItems.filter(item => 
    item.is_premium || 
    item.item_type === 'tool' || 
    item.item_type === 'upgrade'
  );

  const filteredItems = selectedCategory === 'all' 
    ? premiumItems 
    : premiumItems.filter(item => item.item_type === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-purple-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-purple-100">
      <GameHeader garden={gameState.garden} />
      
      <div className="p-4 pb-20">
        <div className="flex items-center gap-2 mb-4">
          <Gem className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-purple-800">Boutique Premium</h1>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-purple-800">
            💎 <strong>Boutique Premium :</strong> Utilisez vos gemmes pour acheter des outils puissants 
            et des améliorations exclusives qui boosteront votre jardin !
          </p>
        </div>
        
        {/* Category filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-600 border border-purple-600'
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
              canAfford={(gameState.garden?.gems || 0) >= item.price}
              purchasing={purchasing}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <Gem className="h-12 w-12 mx-auto mb-4 text-purple-400" />
            <p className="text-purple-600 mb-2">Aucun article premium disponible</p>
            <p className="text-sm text-purple-500">
              Continuez à jouer pour gagner des gemmes et débloquer des articles exclusifs !
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
