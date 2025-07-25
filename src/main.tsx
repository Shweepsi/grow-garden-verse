import { createRoot } from 'react-dom/client'
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from '@/hooks/useAuth';
import { AnimationProvider } from '@/contexts/AnimationContext';
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnimationProvider>
          <TooltipProvider>
            <App />
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AnimationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
