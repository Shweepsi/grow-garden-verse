import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const FloatingPackBubble = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Initial position (persisted in localStorage)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem('pack-bubble-pos');
    if (saved) return JSON.parse(saved);
    // Default bottom-right: 16px from right, 92px from bottom (account for nav)
    return { x: window.innerWidth - 80, y: window.innerHeight - 140 };
  });

  // Drag state
  const dragData = useRef<{ startX: number; startY: number; origX: number; origY: number; dragging: boolean }>({ startX: 0, startY: 0, origX: 0, origY: 0, dragging: false });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragData.current.dragging) return;
      const dx = e.clientX - dragData.current.startX;
      const dy = e.clientY - dragData.current.startY;
      const newX = Math.min(Math.max(0, dragData.current.origX + dx), window.innerWidth - 64);
      const newY = Math.min(Math.max(0, dragData.current.origY + dy), window.innerHeight - 64);
      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      if (!dragData.current.dragging) return;
      dragData.current.dragging = false;
      localStorage.setItem('pack-bubble-pos', JSON.stringify(position));
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [position]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragData.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
      dragging: true
    };
  };

  const handleClick = () => {
    // Ignore click if dragging just ended
    if (dragData.current.dragging) return;
    if (location.pathname !== '/profile') {
      navigate('/profile');
    } else {
      document.getElementById('premium-store')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={bubbleRef}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn(
        'fixed z-60 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform select-none',
        'cursor-pointer'
      )}
    >
      <Sparkles className="h-7 w-7" />
    </div>
  );
};