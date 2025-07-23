import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Permissions from "./pages/Permissions";
import Chat from "./pages/Chat";
import Memories from "./pages/Memories";
import VideoFeed from "./pages/VideoFeed";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const showNavigation = !["/", "/permissions"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/feed" element={<VideoFeed />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/memories" element={<Memories />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {showNavigation && <Navigation />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
