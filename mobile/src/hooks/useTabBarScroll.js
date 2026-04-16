import { useContext, useRef, useCallback } from 'react';
import { TabBarContext } from '../context/TabBarContext';

export const useTabBarScroll = () => {
  const { setTabBarVisible } = useContext(TabBarContext);
  const scrollTimeout = useRef(null);

  const handleScroll = useCallback((event) => {
    // Hide immediately when scroll starts
    setTabBarVisible(false);

    // Debounce the re-appearance
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setTabBarVisible(true);
    }, 400); // Wait 400ms after scroll stops to show again
  }, [setTabBarVisible]);

  return { handleScroll };
};
