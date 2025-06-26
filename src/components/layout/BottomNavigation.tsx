
import { useLocation, useNavigate } from 'react-router-dom';
import { Sprout, Package, ShoppingCart, User } from 'lucide-react';

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { 
      icon: Sprout, 
      label: 'Jardin', 
      path: '/', 
      active: location.pathname === '/' 
    },
    { 
      icon: Package, 
      label: 'Inventaire', 
      path: '/inventory', 
      active: location.pathname === '/inventory' 
    },
    { 
      icon: ShoppingCart, 
      label: 'Boutique', 
      path: '/shop', 
      active: location.pathname === '/shop' 
    },
    { 
      icon: User, 
      label: 'Profil', 
      path: '/profile', 
      active: location.pathname === '/profile' 
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              item.active 
                ? 'text-green-600 bg-green-50' 
                : 'text-gray-600 hover:text-green-600'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
