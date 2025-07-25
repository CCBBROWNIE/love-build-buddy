import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Permissions from "./pages/Permissions";
import Chat from "./pages/Chat";
import Memories from "./pages/Memories";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import VideoFeed from "./pages/VideoFeed";
import PrivateChat from "./components/PrivateChat";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SecurityProvider } from "./components/SecurityProvider";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const showNavigation = !["/", "/auth", "/permissions"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute><Permissions /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><VideoFeed /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/memories" element={<ProtectedRoute><Memories /></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
        <Route path="/private-chat/:conversationId" element={<ProtectedRoute><PrivateChat /></ProtectedRoute>} />
        <Route path="/private-chat/new/:userId" element={<ProtectedRoute><PrivateChat /></ProtectedRoute>} />
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
        <AuthProvider>
          <SecurityProvider>
            <AppContent />
          </SecurityProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
