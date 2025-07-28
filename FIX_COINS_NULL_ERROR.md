# Fix for "null value in column coins of relation player_gardens violates not-null constraint"

## Problem Description

The error "null value in column coins of relation player_gardens violates not-null constraint" was occurring during garden updates. This happened because several hooks were performing arithmetic operations on the `coins` column without checking for null values.

## Root Cause

In the TypeScript types, the `coins` field is defined as `number` in the `Row` type but allows `number | null` in some contexts. However, the database schema has a NOT NULL constraint on this column. When the frontend code performed operations like:

```typescript
coins: garden.coins - cost
```

If `garden.coins` was `null`, the result would be `null`, which violates the NOT NULL constraint.

## Files Fixed

The following files were updated to add proper null checking:

1. **`/workspace/src/hooks/useGameEconomy.ts`** (Line 43)
   - Changed: `coins: garden.coins - cost`
   - To: `coins: (garden.coins || 0) - cost`

2. **`/workspace/src/hooks/useUpgrades.ts`** (Line 105)
   - Changed: `coins: garden.coins - costCoins`
   - To: `coins: (garden.coins || 0) - costCoins`

3. **`/workspace/src/hooks/useDirectPlanting.ts`** (Line 153)
   - Changed: `coins: garden.coins - actualCost`
   - To: `coins: (garden.coins || 0) - actualCost`

4. **`/workspace/src/hooks/usePassiveIncomeRobot.ts`** (Line 250)
   - Changed: `coins: garden.coins + totalAccumulated`
   - To: `coins: (garden.coins || 0) + totalAccumulated`

## Database Migration

A new migration file was created (`20250131000000_fix_null_coins.sql`) to:

1. Update any existing null values in the `coins` column to 0
2. Ensure the NOT NULL constraint is properly enforced
3. Add similar protections for other essential columns like `total_harvests` and `robot_level`

## Prevention

The fix ensures that:
- All arithmetic operations on the `coins` column use null coalescing (`|| 0`)
- The database enforces NOT NULL constraints with proper defaults
- Future similar issues are prevented by following this pattern

## Note

Files that were already correctly handling null values (like the ad reward functions) were left unchanged as they already used the proper pattern: `(garden.coins || 0)`.