import { BottomNavigation } from './BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/components/auth/AuthPage';
import { Loader2 } from 'lucide-react';
interface AppLayoutProps {
  children: React.ReactNode;
}
export const AppLayout = ({
  children
}: AppLayoutProps) => {
  const {
    user,
    loading
  } = useAuth();
  if (loading) {
    return <div className="min-h-screen garden-background flex items-center justify-center">
        <div className="glassmorphism rounded-2xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>;
  }
  if (!user) {
    return <AuthPage />;
  }
  return <div className="min-h-screen garden-background relative">
      {/* Floating particles for ambiance */}
      <div className="floating-particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      {/* Main content with padding for sticky header and footer */}
      <div className="relative z-10 pb-20 px-px my-0 mx-0 py-0">
        {children}
      </div>
      
      {/* Sticky bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNavigation />
      </div>
    </div>;
};