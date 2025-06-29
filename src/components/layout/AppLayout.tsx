
import { BottomNavigation } from './BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/components/auth/AuthPage';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-2xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen garden-background relative flex flex-col">
      {/* Floating particles for ambiance */}
      <div className="floating-particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      {/* Main content with proper spacing for sticky elements */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex-1 pb-20">
          {children}
        </div>
      </div>
      
      {/* Sticky Bottom Navigation */}
      <div className="sticky bottom-0 z-50">
        <BottomNavigation />
      </div>
    </div>
  );
};
