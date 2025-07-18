
import { BottomNavigation } from './BottomNavigation';
import { ProtectedRoute } from './ProtectedRoute';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen garden-background relative">
        {/* Floating particles for ambiance */}
        <div className="floating-particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
        
        {/* Main content with padding for sticky navigation */}
        <div className="relative z-10 pb-20 px-px my-0 mx-0 py-0">
          {children}
        </div>
        
        {/* Sticky bottom navigation */}
        <BottomNavigation />
      </div>
    </ProtectedRoute>
  );
};
