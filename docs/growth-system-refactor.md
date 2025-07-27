# Growth System Refactoring Documentation

## Overview

The growth system has been refactored to provide a cleaner, more maintainable, and more efficient implementation. The refactoring consolidates growth-related logic into dedicated services and provides clear interfaces for growth calculations.

## Key Changes

### 1. New GrowthService (`/src/services/growth/GrowthService.ts`)

A centralized service that handles all growth-related calculations:

- **Clear Interfaces**: Defined `GrowthModifiers` and `GrowthCalculation` interfaces
- **Consistent Calculations**: All growth time calculations use the same logic
- **Better Performance**: Removed unnecessary caching complexity
- **Type Safety**: Strong typing throughout

### 2. Growth Modifiers

Growth speed can be modified by three sources:
- **Upgrades**: Permanent speed improvements purchased by players
- **Ad Boosts**: Temporary speed boosts from watching ads
- **Items**: Future implementation for consumable items

All modifiers multiply together for cumulative effect.

### 3. Simplified Ad Boost System

- **Consistent Storage**: Ad boosts store reduction as decimal (0.8 = 20% reduction)
- **Clear Conversions**: Helper methods to convert between percentage and multiplier
- **Better Display**: Formatted boost information shows actual reduction percentage

### 4. New Hook: useGrowthModifiers

Provides a simple interface to access all growth modifiers:
```typescript
const { modifiers, totalMultiplier, formatReduction } = useGrowthModifiers();
```

## Usage Examples

### Basic Growth Calculation
```typescript
import { GrowthService } from '@/services/growth/GrowthService';

// Get base growth time for a plant
const baseTime = GrowthService.getBaseGrowthTime(plantType);

// Calculate with modifiers
const calculation = GrowthService.calculateGrowthTime(baseTime, {
  upgrades: 1.3,    // 30% faster from upgrades
  adBoost: 1.5,     // 50% faster from ad
  items: 1.0        // No item boost
});

console.log(calculation.finalTimeSeconds); // Reduced time
console.log(calculation.timeReduction);    // Percentage reduction
```

### Using the Hook
```typescript
import { useGrowthModifiers } from '@/hooks/useGrowthModifiers';

function PlantInfo() {
  const { modifiers, formatReduction } = useGrowthModifiers();
  
  const reduction = formatReduction(baseGrowthTime);
  // Returns "-45%" if growth is 45% faster
}
```

### Ad Boost Application
```typescript
// When applying a 20% growth speed boost
const reductionPercentage = 20;
const effectValue = AdBoostService.growthBoostPercentageToEffectValue(reductionPercentage);
// effectValue = 0.8 (stored in database)

// When displaying the boost
const info = AdBoostService.formatBoostInfo('growth_boost', effectValue);
// info.label = "Croissance -20%"
```

## Migration Notes

### PlantGrowthService
The old `PlantGrowthService` now acts as a facade to maintain backward compatibility. It internally uses the new `GrowthService` while preserving the existing API.

### Database Storage
No database changes required. The `effect_value` field continues to store:
- For growth boosts: decimal value (0.8 = 20% reduction)
- For other boosts: multiplier value (1.5 = 50% increase)

### Component Updates
Existing components continue to work without changes. New components should use `GrowthService` directly or the `useGrowthModifiers` hook.

## Benefits

1. **Clarity**: Clear separation between different types of modifiers
2. **Maintainability**: Centralized logic is easier to update and test
3. **Performance**: Removed complex caching in favor of simple calculations
4. **Extensibility**: Easy to add new modifier types (items, weather, etc.)
5. **Type Safety**: Strong typing prevents calculation errors

## Future Enhancements

1. **Item System**: Add consumable items that provide temporary growth boosts
2. **Weather Effects**: Environmental factors that affect growth
3. **Plant-Specific Modifiers**: Some plants could grow faster/slower
4. **Stacking Rules**: Define how different boost types interact