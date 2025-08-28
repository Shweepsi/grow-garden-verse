import { useRef, useCallback } from 'react';
import { FloatingAnimation } from '@/contexts/AnimationContext';

interface PooledFloatingNumber {
  id: string;
  element: HTMLDivElement | null;
  isActive: boolean;
  animation?: FloatingAnimation;
}

const POOL_SIZE = 6; // Réduire la taille du pool pour éviter trop d'éléments DOM

/**
 * Hook pour gérer un pool d'éléments DOM réutilisables pour les animations de nombres flottants
 * Évite les créations/destructions d'éléments DOM répétées
 */
export const useFloatingNumberPool = () => {
  const poolRef = useRef<PooledFloatingNumber[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialiser le pool si nécessaire
  const initializePool = useCallback(() => {
    if (poolRef.current.length === 0) {
      poolRef.current = Array.from({ length: POOL_SIZE }, (_, index) => ({
        id: `pool-${index}`,
        element: null,
        isActive: false
      }));
    }
  }, []);

  // Obtenir un élément libre du pool
  const acquireElement = useCallback((animation: FloatingAnimation): HTMLDivElement | null => {
    initializePool();
    
    // Trouver un élément libre
    const poolItem = poolRef.current.find(item => !item.isActive);
    if (!poolItem) return null; // Pool saturé

    // Créer l'élément DOM si nécessaire
    if (!poolItem.element) {
      poolItem.element = document.createElement('div');
      poolItem.element.className = 'floating-number';
      poolItem.element.style.cssText = `
        position: absolute;
        pointer-events: none;
        font-weight: 600;
        font-size: 0.875rem;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        opacity: 0;
        transform: translateY(0);
        transition: none;
      `;
    }

    // Configurer l'élément pour cette animation
    poolItem.isActive = true;
    poolItem.animation = animation;
    
    const element = poolItem.element;
    
    // Appliquer les styles basés sur l'animation
    const isNegative = animation.amount < 0;
    const color = animation.type === 'coins' ? (isNegative ? '#dc2626' : '#16a34a') :
                  animation.type === 'experience' ? '#3b82f6' : '#a855f7';
    
    element.style.color = color;
    // Position basée sur la grille (comme dans le CSS original)
    element.style.gridRowStart = `${animation.row + 1}`;
    element.style.gridColumnStart = `${animation.col + 1}`;
    element.style.transform = `translate(${animation.jitterX}px, ${animation.jitterY}px)`;
    element.style.opacity = '0';
    element.style.transform = 'translateY(0)';
    
    // Contenu avec icône
    const icon = animation.type === 'coins' ? '🪙' :
                 animation.type === 'experience' ? '⭐' : '💎';
    
    const formattedAmount = Math.abs(animation.amount) >= 1000 
      ? `${(Math.abs(animation.amount) / 1000).toFixed(1)}K`
      : Math.abs(animation.amount).toString();
    
    // Secure DOM manipulation - avoid innerHTML
    element.textContent = '';
    
    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    element.appendChild(iconSpan);
    
    const amountSpan = document.createElement('span');
    amountSpan.textContent = `${isNegative ? '-' : '+'}${formattedAmount}`;
    element.appendChild(amountSpan);
    
    return element;
  }, [initializePool]);

  // Libérer un élément et le remettre dans le pool
  const releaseElement = useCallback((element: HTMLDivElement) => {
    const poolItem = poolRef.current.find(item => item.element === element);
    if (poolItem) {
      poolItem.isActive = false;
      poolItem.animation = undefined;
      
      // Nettoyer l'élément
      if (poolItem.element) {
        poolItem.element.style.opacity = '0';
        poolItem.element.style.transform = 'translateY(0)';
        if (poolItem.element.parentNode) {
          poolItem.element.parentNode.removeChild(poolItem.element);
        }
      }
    }
  }, []);

  // Animer un élément
  const animateElement = useCallback((element: HTMLDivElement, animation: FloatingAnimation) => {
    if (!containerRef.current) return;
    
    // Ajouter à la grille d'animations
    const animationGrid = containerRef.current.querySelector('.floating-animations-grid');
    if (animationGrid) {
      animationGrid.appendChild(element);
    } else {
      containerRef.current.appendChild(element);
    }
    
    // Démarrer l'animation
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(-50px)';
      element.style.transition = 'all 2s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Fade out après 1.5s
      setTimeout(() => {
        element.style.opacity = '0';
      }, 1500);
      
      // Libérer après l'animation
      setTimeout(() => {
        releaseElement(element);
      }, 2000);
    });
  }, [releaseElement]);

  const setContainer = useCallback((container: HTMLDivElement | null) => {
    containerRef.current = container;
  }, []);

  return {
    acquireElement,
    releaseElement,
    animateElement,
    setContainer
  };
};