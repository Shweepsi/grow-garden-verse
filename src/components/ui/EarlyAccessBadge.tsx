import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useEarlyAccessPerks } from '@/hooks/useEarlyAccessPerks';

export const EarlyAccessBadge = () => {
  const { hasEarlyAccessMultiplier, getEarlyAccessMultiplier } = useEarlyAccessPerks();

  if (!hasEarlyAccessMultiplier()) {
    return null;
  }

  const multiplier = getEarlyAccessMultiplier();

  return (
    <Badge 
      variant="secondary" 
      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg"
    >
      <Sparkles className="h-3 w-3 mr-1" />
      Early Access X{multiplier}
    </Badge>
  );
};