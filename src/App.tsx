import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { PWAUpdatePrompt } from "@/components/ui/pwa-update-prompt";
import { PageLoading } from "@/components/ui/page-loading";
import { NetworkStatus } from "@/components/ui/loading-states";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Lazy load pages for better code splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Habits = lazy(() => import("./pages/Habits"));
const Finances = lazy(() => import("./pages/Finances"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AllTransactions = lazy(() => import("./pages/AllTransactions"));
const Chores = lazy(() => import("./pages/Chores"));
const Todos = lazy(() => import("./pages/Todos"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <AuthProvider>
          <ErrorBoundary>
            <TooltipProvider>
              <NetworkStatus />
              <Toaster />
              <Sonner />
              <PWAUpdatePrompt />
              <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
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
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
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
              </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </ErrorBoundary>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;