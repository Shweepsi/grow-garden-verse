import { useState, useEffect, useCallback } from 'react';

export type GridLayout = '3x3' | '4x4';

const STORAGE_KEY = 'garden-grid-layout';

export const useGridLayout = () => {
  const [gridLayout, setGridLayoutState] = useState<GridLayout>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '3x3' || stored === '4x4') {
        return stored;
      }
    }
    return '3x3'; // Default to 3x3
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, gridLayout);
  }, [gridLayout]);

  const setGridLayout = useCallback((layout: GridLayout) => {
    setGridLayoutState(layout);
  }, []);

  return { gridLayout, setGridLayout };
};
