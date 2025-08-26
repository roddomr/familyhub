import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Finances from "./pages/Finances";
import AllTransactions from "./pages/AllTransactions";
import Chores from "./pages/Chores";
import Todos from "./pages/Todos";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/habits" element={
            <ProtectedRoute>
              <Habits />
            </ProtectedRoute>
          } />
          <Route path="/finances" element={
            <ProtectedRoute>
              <Finances />
            </ProtectedRoute>
          } />
          <Route path="/finances/transactions" element={
            <ProtectedRoute>
              <AllTransactions />
            </ProtectedRoute>
          } />
          {/* Placeholder routes for future modules */}
          <Route path="/todos" element={
            <ProtectedRoute>
              <Todos />
            </ProtectedRoute>
          } />
          <Route path="/chores" element={
            <ProtectedRoute>
              <Chores />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;