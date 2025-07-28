import { useReducer, useCallback, useMemo } from 'react';
import { AdReward } from '@/types/ads';

interface AdModalState {
  selectedReward: AdReward | null;
}

type AdModalAction =
  | { type: 'SET_SELECTED_REWARD'; payload: AdReward | null }
  | { type: 'RESET' };

const initialState: AdModalState = {
  selectedReward: null
};

function adModalReducer(state: AdModalState, action: AdModalAction): AdModalState {
  switch (action.type) {
    case 'SET_SELECTED_REWARD':
      // Prevent unnecessary re-renders if the reward is the same
      if (state.selectedReward === action.payload) return state;
      return { ...state, selectedReward: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useAdModalState() {
  const [state, dispatch] = useReducer(adModalReducer, initialState);

  // Memoize callbacks to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    setSelectedReward: (reward: AdReward | null) => {
      dispatch({ type: 'SET_SELECTED_REWARD', payload: reward });
    },
    reset: () => {
      dispatch({ type: 'RESET' });
    }
  }), []);

  return {
    ...state,
    ...actions
  };
}