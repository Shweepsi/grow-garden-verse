
import { BottomNavigation } from './BottomNavigation';
import { ProtectedRoute } from './ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleStarterPackClick = () => {
    if (location.pathname !== '/profile') {
      navigate('/profile');
    } else {
      // Scroll jusqu'à la boutique premium si déjà sur la page Profil
      document.getElementById('premium-store')?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  return (
    <ProtectedRoute>
      <div className="min-h-dvh flex flex-col garden-background relative">
        {/* Floating particles for ambiance */}
        <div className="floating-particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
        
        {/* Main content with padding for sticky navigation */}
        <div className="flex-1 relative z-10 pb-[calc(5rem+env(safe-area-inset-bottom))] px-px">
          {children}
        </div>
        
        {/* Bouton flottant Early Access Pack */}
        <Button
          onClick={handleStarterPackClick}
          className="fixed z-60 bottom-24 right-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg rounded-full px-4 py-3 flex items-center gap-2 animate-bounce touch-target"
        >
          <Sparkles className="h-5 w-5" />
          Early Access Pack
        </Button>

        {/* Sticky bottom navigation */}
        <BottomNavigation />
      </div>
    </ProtectedRoute>
  );
};
