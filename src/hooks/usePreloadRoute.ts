import { useCallback } from 'react';

// Route preloaders
const routePreloaders = {
  dashboard: () => import('../pages/Dashboard'),
  finances: () => import('../pages/Finances'),
  allTransactions: () => import('../pages/AllTransactions'),
  settings: () => import('../pages/Settings'),
  habits: () => import('../pages/Habits'),
  todos: () => import('../pages/Todos'),
  chores: () => import('../pages/Chores'),
};

export function usePreloadRoute() {
  const preloadRoute = useCallback((routeName: keyof typeof routePreloaders) => {
    const preloader = routePreloaders[routeName];
    if (preloader) {
      // Start preloading the component
      preloader();
    }
  }, []);

  return { preloadRoute };
}