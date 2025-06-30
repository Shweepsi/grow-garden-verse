
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Hook simplifié - pas d'outils pour le moment
export const useToolApplication = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const applyToolMutation = useMutation({
    mutationFn: async ({ plotNumber, toolId, cost }: { plotNumber: number; toolId: string; cost: number }) => {
      // Fonctionnalité non implémentée pour le moment
      throw new Error('Les outils ne sont pas encore disponibles');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'application de l\'outil');
    }
  });

  return {
    applyTool: (plotNumber: number, toolId: string, cost: number) => 
      applyToolMutation.mutate({ plotNumber, toolId, cost }),
    isApplying: applyToolMutation.isPending
  };
};
