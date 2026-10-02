import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { useUIStore } from '../stores';

/**
 * Handles Android hardware back button, system navigation gestures,
 * and edge swipe gestures in APK / Capacitor / Mobile WebView.
 *
 * Prevents the application from accidentally closing when navigating
 * sub-pages and smoothly navigates back to the previous page or root page.
 */
export function useAndroidBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const lastBackPressRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // 1. Capacitor Native Android Hardware / System Back Button & Gesture Listener
  useEffect(() => {
    let handler: any = null;

    const setupCapacitorBack = async () => {
      try {
        handler = await CapApp.addListener('backButton', ({ canGoBack }) => {
          const currentPath = window.location.pathname;

          // If on the home / root page
          if (currentPath === '/') {
            const now = Date.now();
            if (now - lastBackPressRef.current < 2000) {
              CapApp.exitApp();
            } else {
              lastBackPressRef.current = now;
              showToast('Press back again to exit', 'info');
            }
            return;
          }

          // If on any sub-page or other tabs, navigate back to previous screen or root
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
          } else if (canGoBack) {
            navigate(-1);
          } else {
            navigate('/', { replace: true });
          }
        });
      } catch {
        // Not running in Capacitor native environment (e.g. browser)
      }
    };

    setupCapacitorBack();

    return () => {
      if (handler && typeof handler.remove === 'function') {
        handler.remove();
      }
    };
  }, [navigate, showToast]);

  // 2. Smooth edge swipe-to-back gesture on touch devices (left edge to right swipe)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        // Only trigger if touch started near the left edge (within 30px)
        if (touch.clientX < 30) {
          touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
          };
        } else {
          touchStartRef.current = null;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const deltaTime = Date.now() - touchStartRef.current.time;

      touchStartRef.current = null;

      // Swiped right with sufficient distance and primarily horizontal movement within 500ms
      if (deltaX > 75 && deltaY < 60 && deltaTime < 500) {
        if (location.pathname !== '/') {
          navigate(-1);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate]);
}
