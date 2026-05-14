import { useEffect } from 'react';
import { useLocation } from 'react-router';

/// React Router doesn't restore scroll on navigation by default — it leaves
/// the new page wherever the previous one was. Mount this once at the App
/// root and every pathname change snaps the window back to the top. Tabs
/// inside a single route keep their own state because the pathname doesn't
/// change there.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use `auto` (instant) — animated scroll feels janky during route swap.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
