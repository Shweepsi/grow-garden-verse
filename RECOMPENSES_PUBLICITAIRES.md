# 🎁 Système de Récompenses Publicitaires - Améliorations

## 📋 Vue d'ensemble

Ce document décrit les améliorations apportées au système de récompenses publicitaires d'Idle Grow, qui utilise maintenant pleinement les données Supabase pour un affichage dynamique et personnalisé.

## ✨ Nouvelles fonctionnalités

### 1. **Affichage dynamique depuis Supabase**
- ✅ Les récompenses sont maintenant récupérées directement depuis la table `ad_reward_configs`
- ✅ Calcul automatique basé sur le niveau du joueur
- ✅ Mise en cache intelligente pour des performances optimales

### 2. **Interface utilisateur améliorée**

#### GameHeader redesigné
- 🎨 Interface moderne avec cartes et badges
- 📊 Affichage des multiplicateurs actifs (pièces, gemmes, croissance)
- 🎁 Aperçu des récompenses disponibles en temps réel

#### Sélecteur de récompenses amélioré
- 🌈 Gradients de couleur par type de récompense
- 📱 Interface responsive avec mode sombre
- ⏱️ Affichage de la durée pour les boosts temporaires
- 🔢 Indication claire des valeurs et pourcentages

#### Indicateur de boosts actifs
- 📈 Progression visuelle du temps restant
- 🎯 Descriptions détaillées des effets
- 💫 Multiplicateurs actuels en temps réel

### 3. **Boosts de croissance - "Temps de Croissance x2"**

#### Affichage explicite
```typescript
// Avant : "Boost croissance x2"
// Maintenant : "Temps de croissance -50% (30min)"
//              "Ex: Carotte: 30s → 15s, Tomate: 2min → 1min"
```

#### Calculs transparents
- 🧮 Réduction en pourcentage clairement indiquée
- 📋 Exemples concrets avec plantes populaires
- ⚡ Multiplicateur technique affiché pour les développeurs

## 🗄️ Structure des données Supabase

### Table `ad_reward_configs`
```sql
CREATE TABLE public.ad_reward_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_type TEXT NOT NULL UNIQUE,  -- 'growth_speed', 'coins', etc.
  display_name TEXT NOT NULL,        -- 'Croissance Rapide'
  description TEXT NOT NULL,         -- Description affichée
  emoji TEXT,                        -- '🌱'
  base_amount NUMERIC NOT NULL,      -- Valeur de base
  level_coefficient NUMERIC,         -- Progression par niveau
  max_amount NUMERIC,                -- Valeur maximum
  min_player_level INTEGER,          -- Niveau requis
  duration_minutes INTEGER,          -- Durée pour les boosts
  active BOOLEAN DEFAULT TRUE
);
```

### Exemple de configuration Growth Speed
```sql
INSERT INTO public.ad_reward_configs VALUES (
  'growth_speed',
  'Boost Croissance',
  'Réduction temps de croissance',
  '🌱',
  2.0,        -- Multiplicateur x2 (= -50% de temps)
  0.1,        -- +0.1 par niveau
  3.0,        -- Maximum x3 (= -66% de temps)
  1,          -- Dès le niveau 1
  30          -- 30 minutes
);
```

## 🔧 Architecture technique

### Hook `useAdRewards`
```typescript
export const useAdRewards = () => {
  // État centralisé pour toutes les récompenses
  const [availableRewards, setAvailableRewards] = useState<AdReward[]>([]);
  
  // Chargement automatique basé sur le niveau
  const loadAvailableRewards = useCallback(async () => {
    const playerLevel = gameData?.garden?.level || 1;
    const rewards = await AdRewardService.getAvailableRewards(playerLevel);
    setAvailableRewards(rewards);
  }, [gameData?.garden?.level]);
  
  return {
    availableRewards,
    loadingRewards,
    refreshRewards
  };
};
```

### Service `AdRewardService`
```typescript
class AdRewardService {
  // Calcul intelligent des descriptions
  private static formatGrowthSpeedDescription(multiplier: number, duration: number): string {
    const reductionPercent = Math.round((1 - (1 / multiplier)) * 100);
    
    // Exemples concrets
    const carrotFast = Math.floor(30 / multiplier); // 30s → 15s
    const tomatoFast = Math.floor(120 / multiplier); // 2min → 1min
    
    return `Temps de croissance -${reductionPercent}% (${duration}min)
Ex: Carotte: 30s → ${carrotFast}s, Tomate: 2min → ${Math.floor(tomatoFast/60)}m`;
  }
}
```

## 🎮 Expérience utilisateur

### Avant
- ❌ Affichage statique : "Boost croissance x2"
- ❌ Pas d'exemples concrets
- ❌ Interface basique

### Maintenant  
- ✅ **"Temps de croissance -50% (30min)"**
- ✅ **"Ex: Carotte: 30s → 15s, Tomate: 2min → 1min"**
- ✅ Interface moderne avec gradients et animations
- ✅ Aperçu temps réel des récompenses disponibles
- ✅ Progression visuelle des boosts actifs

## 📱 Composants mis à jour

### `GameHeader`
- Affichage centralisé des stats et récompenses
- Aperçu des récompenses disponibles
- Indicateurs de multiplicateurs actifs

### `AdRewardSelector`
- Interface cards avec gradients
- Descriptions détaillées
- Support mode sombre

### `BoostStatusIndicator` 
- Progression temps réel
- Descriptions explicites des effets
- Résumé des multiplicateurs

### `AdModal`
- Simplification du code
- Utilisation centralisée du hook `useAdRewards`
- Meilleure gestion d'état

## 🚀 Déploiement

Les améliorations sont entièrement compatibles avec l'existant :
- ✅ Pas de breaking changes
- ✅ Migration automatique `growth_boost` → `growth_speed`
- ✅ Fallbacks en cas d'erreur
- ✅ Cache intelligent pour les performances

## 🔮 Évolutions futures

1. **Personnalisation avancée**
   - Récompenses basées sur l'historique du joueur
   - Adaptation selon les plantes favorites

2. **Analytics intégrées**
   - Tracking des préférences de récompenses
   - Optimisation automatique des valeurs

3. **Variabilité dynamique**
   - Événements spéciaux avec bonus
   - Récompenses saisonnières

---

*Les récompenses publicitaires d'Idle Grow utilisent maintenant pleinement les données Supabase pour offrir une expérience plus riche et transparente aux joueurs !* 🎉