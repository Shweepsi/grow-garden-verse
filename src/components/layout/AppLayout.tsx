
import { BottomNavigation } from './BottomNavigation';
import { ProtectedRoute } from './ProtectedRoute';
// No additional hooks needed here
import { FloatingPackBubble } from './FloatingPackBubble';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {

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
        
        {/* Bulle flottante Early Access Pack */}
        <FloatingPackBubble />

        {/* Sticky bottom navigation */}
        <BottomNavigation />
      </div>
    </ProtectedRoute>
  );
};
