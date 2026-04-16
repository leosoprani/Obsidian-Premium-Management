import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemeContext } from '../styles/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function MeshBackground({ colors: colorsProp }) {
  const themeCtx = React.useContext(ThemeContext);
  const activeTheme = themeCtx?.theme || { colors: { background: '#000', primary: '#1a1a1a', secondary: '#333' } };
  
  // Determine colors to use: provided prop > theme colors > safe fallback
  const colors = colorsProp || [
    activeTheme.colors.primary,
    activeTheme.colors.secondary,
    activeTheme.colors.background
  ];

  // Animating blobs for a "living" background feel
  const moveAnim1 = React.useRef(new Animated.Value(0)).current;
  const moveAnim2 = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    };

    createLoop(moveAnim1, 8000).start();
    createLoop(moveAnim2, 12000).start();
  }, []);

  const trans1 = moveAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  const trans2 = moveAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [50, -50],
  });

  // Ensure we have at least 3 colors for the gradient
  const gradientColors = colors.length >= 3 ? [colors[0], colors[1], colors[2]] : [colors[0] || '#000', colors[1] || '#111', '#222'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.absolute}
      />
      
      {/* Animated Mesh Blobs */}
      <Animated.View style={[
        styles.blob, 
        { 
          backgroundColor: colors[0], 
          top: -100, 
          right: -100, 
          opacity: 0.4,
          transform: [{ translateX: trans1 }, { translateY: trans2 }]
        }
      ]} />
      
      <Animated.View style={[
        styles.blob, 
        { 
          backgroundColor: colors[1], 
          bottom: -150, 
          left: -100, 
          opacity: 0.3,
          transform: [{ translateX: trans2 }, { translateY: trans1 }]
        }
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  absolute: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    filter: 'blur(80px)', // Note: standard CSS filter doesn't work in RN without extra libs, 
    // but in Expo/RN we use opacity and large borderRadius to simulate it.
    // For a real blur on Android/iOS, we'd need react-native-skia or similar.
    // We'll use large overlapping gradients for now.
  }
});
