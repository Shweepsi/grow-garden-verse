/**
 * Configuration simple pour les gemmes
 * Une récolte = une chance fixe de 15%
 */
export const GEM_CONFIG = {
  // Probabilité fixe pour chaque récolte (15%)
  DROP_CHANCE: 0.15,
  
  // Toujours 1 gemme par drop réussi
  REWARD_AMOUNT: 1
} as const;

/**
 * Fonction simple pour calculer si une gemme doit être accordée
 * Utilise une graine déterministe pour éviter les duplications
 */
export function shouldDropGem(userId: string, plotNumber: number, plantedAt: string): boolean {
  // Créer une graine unique basée sur les paramètres de la récolte
  const seedString = `${userId}-${plotNumber}-${plantedAt}`;
  
  // Hash simple pour créer un nombre pseudo-aléatoire reproductible
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convertir en nombre entre 0 et 1
  const normalizedHash = Math.abs(hash) / Math.pow(2, 31);
  
  // Retourner true si sous la probabilité de drop
  return normalizedHash < GEM_CONFIG.DROP_CHANCE;
}