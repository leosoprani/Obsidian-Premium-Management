import React, { createContext, useState, useCallback, useRef } from 'react';
import { Animated } from 'react-native';

export const TabBarContext = createContext();

export const TabBarProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const setTabBarVisible = useCallback((visible) => {
    if (visible === isVisible) return;
    setIsVisible(visible);
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fadeAnim]);

  return (
    <TabBarContext.Provider value={{ isVisible, setTabBarVisible, fadeAnim }}>
      {children}
    </TabBarContext.Provider>
  );
};
