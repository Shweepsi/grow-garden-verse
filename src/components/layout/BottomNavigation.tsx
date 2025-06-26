
import { Home, TrendingUp, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { path: '/garden', icon: Home, label: 'Jardin' },
    { path: '/upgrades', icon: TrendingUp, label: 'Améliorations' },
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-4 mb-4">
        <div className="glassmorphism rounded-2xl p-2">
          <div className="flex justify-around">
            {navigationItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center py-3 px-4 rounded-xl transition-all duration-300 group relative ${
                    isActive 
                      ? 'bg-gradient-to-t from-green-500 to-green-400 text-white shadow-lg transform scale-105' 
                      : 'text-gray-600 hover:text-green-600 hover:bg-white/40'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-t from-green-500 to-green-400 rounded-xl opacity-20 animate-pulse"></div>
                  )}
                  
                  <Icon className={`h-5 w-5 mb-1 transition-all duration-300 ${
                    isActive ? 'transform scale-110' : 'group-hover:scale-110'
                  }`} />
                  
                  <span className={`text-xs font-medium transition-all duration-300 ${
                    isActive ? 'font-bold' : ''
                  }`}>
                    {label}
                  </span>
                  
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-ping"></div>
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
