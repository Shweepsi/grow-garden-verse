# 🎯 Affichage Dynamique des AdRewards - Intégration Supabase

## 📋 Vue d'ensemble

L'affichage des récompenses publicitaires (AdRewards) est maintenant **entièrement dynamique** et basé sur les données stockées dans Supabase. Les changements de configuration se reflètent automatiquement dans l'interface utilisateur.

## 🔧 Architecture de l'affichage dynamique

### 1. **Source de données : Table `ad_reward_configs`**

```sql
CREATE TABLE public.ad_reward_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_type TEXT NOT NULL UNIQUE, -- 'coins', 'gems', 'gem_boost', etc.
  display_name TEXT NOT NULL,        -- "Boost Gemmes"
  description TEXT NOT NULL,         -- "Boost gemmes x1.5"
  emoji TEXT,                        -- "✨" (dynamique!)
  base_amount NUMERIC NOT NULL,      -- 1.5
  level_coefficient NUMERIC DEFAULT 1.0,
  max_amount NUMERIC,
  min_player_level INTEGER DEFAULT 1,
  duration_minutes INTEGER,          -- 30 pour les boosts
  active BOOLEAN DEFAULT TRUE
);
```

### 2. **Hook `useAdRewards` amélioré**

**Avant** : Chargement statique occasionnel
```typescript
// ❌ Ancien système : pas de temps réel
const loadRewards = async () => {
  const rewards = await AdRewardService.getAvailableRewards(level);
  setRewards(rewards); // Statique
};
```

**Maintenant** : React Query avec rafraîchissement automatique
```typescript
// ✅ Nouveau système : temps réel avec React Query
const availableRewardsQuery = useQuery({
  queryKey: ['adRewards', gameData?.garden?.level],
  queryFn: () => AdRewardService.getAvailableRewards(gameData?.garden?.level || 1),
  staleTime: 1 * 60 * 1000, // 1 minute
  refetchInterval: 30 * 1000, // Rafraîchissement automatique
});
```

### 3. **Composant `AdRewardSelector` dynamique**

**Icônes dynamiques depuis Supabase :**
```typescript
// ✅ Utilise l'emoji de la base de données
const getRewardIcon = (reward: AdReward) => {
  // Priorité à l'emoji de la base de données
  if (reward.emoji && reward.emoji.trim()) {
    return reward.emoji; // 🎯 Dynamique !
  }
  
  // Fallback par type si pas d'emoji en base
  switch (reward.type) {
    case 'gem_boost': return '✨';
    // ...
  }
};

// Dans le JSX :
<span>{getRewardIcon(reward)}</span> {/* 🎯 Emoji dynamique */}
```

**Affichage des montants basé sur les données :**
```typescript
// ✅ Affichage intelligent selon le type
{(reward.type === 'coins' || reward.type === 'gems') && (
  <span>+{Math.floor(reward.amount).toLocaleString()}</span>
)}
{(reward.type.includes('boost') || reward.type === 'growth_speed') && (
  <span>×{reward.amount}</span>
)}
```

## 🚀 Fonctionnalités temps réel

### **1. Rafraîchissement automatique**
- ⏱️ **Toutes les 30 secondes** : Vérification des changements
- 🔄 **À l'ouverture du modal** : Données les plus récentes
- 💾 **Cache intelligent** : Évite les requêtes inutiles

### **2. Rafraîchissement manuel**
```typescript
const { refreshRewards, clearRewardsCache } = useAdRewards();

// Force le rechargement depuis Supabase
await refreshRewards();

// Vide complètement le cache
clearRewardsCache();
```

### **3. Interface de test en temps réel**
Le composant `AdRewardAdminPanel` permet de :
- 🔧 **Modifier** les récompenses en temps réel
- 👀 **Voir** les changements instantanément
- 🔄 **Restaurer** les valeurs par défaut
- 🗑️ **Vider** le cache pour forcer le rechargement

## 📊 Flux de données

```mermaid
graph TD
    A[Supabase ad_reward_configs] --> B[AdRewardService]
    B --> C[React Query Cache]
    C --> D[useAdRewards Hook]
    D --> E[AdModal]
    E --> F[AdRewardSelector]
    F --> G[Interface Utilisateur]
    
    H[Modification BDD] --> I[RefreshInterval 30s]
    I --> C
    
    J[refreshRewards()] --> K[Invalidation Cache]
    K --> C
```

## 🎯 Avantages de l'implémentation

### **1. Temps réel**
- Les modifications de la base se reflètent automatiquement
- Pas besoin de redémarrer l'application
- Synchronisation multi-utilisateurs

### **2. Performance optimisée**
- **Cache intelligent** avec React Query
- **Stale-while-revalidate** : Interface toujours réactive
- **Requêtes groupées** pour éviter les appels redondants

### **3. Flexibilité maximale**
```typescript
// Changement d'emoji depuis la base de données
UPDATE ad_reward_configs 
SET emoji = '🌟' 
WHERE reward_type = 'gem_boost';
// -> Se reflète immédiatement dans l'UI

// Modification du multiplicateur
UPDATE ad_reward_configs 
SET base_amount = 2.0, 
    description = 'Boost gemmes x2 (Promo!)' 
WHERE reward_type = 'gem_boost';
// -> Interface mise à jour automatiquement
```

### **4. Extensibilité**
- Nouveaux types de récompenses sans modification du code
- Couleurs et styles personnalisables via la base
- A/B testing facile avec les configurations

## 🔧 Configuration des intervalles

```typescript
// Hook useAdRewards
const availableRewardsQuery = useQuery({
  staleTime: 1 * 60 * 1000,     // 1 minute : données considérées fraîches
  refetchInterval: 30 * 1000,   // 30 secondes : vérification automatique
});

// Pour des changements plus fréquents (développement) :
staleTime: 30 * 1000,          // 30 secondes
refetchInterval: 15 * 1000,    // 15 secondes
```

## 🧪 Test de l'affichage dynamique

### **1. Test automatique**
1. Ouvrir le modal des publicités
2. Observer le rafraîchissement automatique toutes les 30s
3. L'indicateur de chargement apparaît brièvement

### **2. Test manuel**
1. Utiliser le panneau `AdRewardAdminPanel`
2. Cliquer sur "Test Gem Boost"
3. Observer le changement immédiat dans l'interface
4. L'emoji et le multiplicateur changent en temps réel

### **3. Test base de données**
```sql
-- Modifier directement en base
UPDATE ad_reward_configs 
SET emoji = '🎁', 
    base_amount = 3.0,
    description = 'Super Boost Gemmes x3!'
WHERE reward_type = 'gem_boost';

-- L'interface se met à jour automatiquement dans les 30 secondes
-- Ou immédiatement si on clique "Rafraîchir"
```

## 📈 Métriques et monitoring

Le système log automatiquement :
```typescript
console.log('AdRewardService: Using cached rewards for level', playerLevel);
console.log('AdRewardService: Fetching fresh rewards from Supabase');
console.log('AdRewardService: Cached sorted rewards for level', playerLevel);
```

## 🔮 Extensions futures possibles

1. **WebSocket temps réel** : Changements instantanés sans polling
2. **Personnalisation par utilisateur** : Récompenses adaptées au profil
3. **Couleurs dynamiques** : Thèmes configurables depuis la base
4. **Analytics intégrées** : Tracking des performances des récompenses

---

✅ **L'affichage des AdRewards est maintenant entièrement dynamique et basé sur Supabase !**