
import { Home, TrendingUp, User } from 'lucide-react';
import { ShoppingCart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { path: '/garden', icon: Home, label: 'Jardin' },
    { path: '/upgrades', icon: TrendingUp, label: 'Améliorations' },
    { path: '/store', icon: ShoppingCart, label: 'Boutique' },
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-2 mb-2">
        <div className="glassmorphism rounded-xl p-1.5">
          <div className="flex justify-around">
            {navigationItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 group relative touch-target flex-1 ${
                    isActive 
                      ? 'bg-gradient-to-t from-green-500 to-green-400 text-white shadow-lg transform scale-105' 
                      : 'text-gray-600 hover:text-green-600 hover:bg-white/40'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-t from-green-500 to-green-400 rounded-lg opacity-20 animate-pulse"></div>
                  )}
                  
                  <Icon className={`h-5 w-5 mb-0.5 transition-all duration-300 ${
                    isActive ? 'transform scale-110' : 'group-hover:scale-110'
                  }`} />
                  
                  <span className={`mobile-text-xs font-medium transition-all duration-300 text-center leading-tight ${
                    isActive ? 'font-bold' : ''
                  }`}>
                    {label}
                  </span>
                  
                  {isActive && (
                    <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-ping"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
