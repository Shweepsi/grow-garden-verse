import { useReducer, useCallback } from 'react';
import { AdReward } from '@/types/ads';

interface AdModalState {
  selectedReward: AdReward | null;
  availableRewards: AdReward[];
  loadingRewards: boolean;
}

type AdModalAction =
  | { type: 'SET_SELECTED_REWARD'; payload: AdReward | null }
  | { type: 'SET_AVAILABLE_REWARDS'; payload: AdReward[] }
  | { type: 'SET_LOADING_REWARDS'; payload: boolean }
  | { type: 'RESET' };

const initialState: AdModalState = {
  selectedReward: null,
  availableRewards: [],
  loadingRewards: false
};

function adModalReducer(state: AdModalState, action: AdModalAction): AdModalState {
  switch (action.type) {
    case 'SET_SELECTED_REWARD':
      return { ...state, selectedReward: action.payload };
    case 'SET_AVAILABLE_REWARDS':
      return { ...state, availableRewards: action.payload };
    case 'SET_LOADING_REWARDS':
      return { ...state, loadingRewards: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useAdModalState() {
  const [state, dispatch] = useReducer(adModalReducer, initialState);

  const setSelectedReward = useCallback((reward: AdReward | null) => {
    dispatch({ type: 'SET_SELECTED_REWARD', payload: reward });
  }, []);

  const setAvailableRewards = useCallback((rewards: AdReward[]) => {
    dispatch({ type: 'SET_AVAILABLE_REWARDS', payload: rewards });
  }, []);

  const setLoadingRewards = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING_REWARDS', payload: loading });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    ...state,
    setSelectedReward,
    setAvailableRewards,
    setLoadingRewards,
    reset
  };
}