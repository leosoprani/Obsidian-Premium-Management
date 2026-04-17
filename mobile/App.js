import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, Platform, ScrollView, Image, Animated, Easing, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Device from 'expo-device';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
// Import Notifications conditionally later to avoid SDK 53 Expo Go crashes

if (Constants.appOwnership !== 'expo') {
    try {
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
    } catch (e) {}
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

import LoginScreen from './src/screens/LoginScreen';
import { THEMES } from './src/styles/theme';
import { ThemeContext } from './src/styles/ThemeContext';
import { TabBarProvider, TabBarContext } from './src/context/TabBarContext';
import AdminDashboard from './src/screens/AdminDashboard';
import AdminReservationsTab from './src/screens/admin/AdminReservationsTab';
import AdminUsersTab from './src/screens/admin/AdminUsersTab';
import AdminFinanceTab from './src/screens/admin/AdminFinanceTab';
import AdminOperationalMenu from './src/screens/admin/AdminOperationalMenu';
import AdminCleaningsTab from './src/screens/admin/AdminCleaningsTab';
import AdminMaintenancesTab from './src/screens/admin/AdminMaintenancesTab';
import AdminBlockingsTab from './src/screens/admin/AdminBlockingsTab';
import AdminEmployeesTab from './src/screens/admin/AdminEmployeesTab';
import AdminGuestsTab from './src/screens/admin/AdminGuestsTab';
import AdminChatTab from './src/screens/admin/AdminChatTab';

import ReservationsTab from './src/screens/owner/ReservationsTab';
import ChatTab from './src/screens/owner/ChatTab';
import StatsTab from './src/screens/owner/StatsTab';
import ProfileTab from './src/screens/owner/ProfileTab';
import CalendarTab from './src/screens/owner/CalendarTab';
import OwnerDashboard from './src/screens/OwnerDashboard';

// ===== ICONS CONFIG (LOCAL PNGS) =====
const MENU_ICONS = {
  dashboard:    { active: require('./assets/icons/dashboard_active.png'),    inactive: require('./assets/icons/dashboard_inactive.png') },
  reservations: { active: require('./assets/icons/reservations_active.png'), inactive: require('./assets/icons/reservations_inactive.png') },
  maintenance:  { active: require('./assets/icons/maintenance_active.png'),  inactive: require('./assets/icons/maintenance_inactive.png') },
  finance:      { active: require('./assets/icons/finance_active.png'),      inactive: require('./assets/icons/finance_inactive.png') },
  accesses:     { active: require('./assets/icons/accesses_active.png'),     inactive: require('./assets/icons/accesses_inactive.png') },
  profile:      { active: require('./assets/icons/profile_active.png'),      inactive: require('./assets/icons/profile_inactive.png') },
  calendar:     { active: require('./assets/icons/calendar_active.png'),     inactive: require('./assets/icons/calendar_inactive.png') },
  chat:         { active: require('./assets/icons/chat_active.png'),         inactive: require('./assets/icons/chat_inactive.png') },
  stats:        { active: require('./assets/icons/stats_active.png'),        inactive: require('./assets/icons/stats_inactive.png') },
};

let globalSocket = null;

const ADMIN_TABS = [
  { key: 'dashboard',   iconId: 'dashboard',    label: 'Dash' },
  { key: 'reservations',iconId: 'reservations', label: 'Reservas', badgeKey: 'reservations' },
  { key: 'maintenance', iconId: 'maintenance',  label: 'Manut.' },
  { key: 'finance',     iconId: 'finance',      label: 'Financeiro' },
  { key: 'users',       iconId: 'accesses',     label: 'Acessos' },
  { key: 'chat',        iconId: 'chat',         label: 'Chat', badgeKey: 'chat' },
  { key: 'profile',     iconId: 'profile',      label: 'Ações' },
];

const OWNER_TABS = [
  { key: 'dashboard',    iconId: 'dashboard',    label: 'Início' },
  { key: 'reservations', iconId: 'reservations', label: 'Lista' },
  { key: 'calendar',     iconId: 'calendar',     label: 'Agenda' },
  { key: 'chat',         iconId: 'chat',         label: 'Chat', badgeKey: 'chat' },
  { key: 'stats',        iconId: 'stats',        label: 'Gráficos' },
  { key: 'profile',      iconId: 'profile',      label: 'Perfil' },
];

function TabBar({ tabs, activeTab, onTabPress, insets, unreadCounts }) {
    const { theme: activeTheme, appearance } = React.useContext(ThemeContext);
    const { fadeAnim } = React.useContext(TabBarContext);
    const { width: screenWidth } = Dimensions.get('window');
    
    // Ensure exactly 4 icons fit on mobile/android by calculating width
    const padding = 30; // total padding of tabBar container
    const tabWidth = (screenWidth - padding) / 4; 
    
    // Animation for the highlight pill
    const activeIndex = tabs.findIndex(t => t.key === activeTab);
    const scrollX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scrollX, {
            toValue: activeIndex * tabWidth,
            useNativeDriver: true,
            friction: 8,
            tension: 40
        }).start();
    }, [activeIndex, tabWidth]);

    return (
        <Animated.View style={[
          styles.tabBar, 
          { 
            backgroundColor: 'rgba(255,255,255,0.08)', 
            borderColor: activeTheme.colors.glassBorder, 
            borderWidth: 1,
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
          }
        ]}>
            <BlurView 
                intensity={Platform.OS === 'ios' ? 70 : 100} 
                tint={appearance === 'dark' ? "dark" : "light"} 
                style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: appearance === 'dark' ? 'rgba(10, 10, 12, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}
            />
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.tabBarScroll, 
                    { paddingHorizontal: 10 }
                ]}
                scrollEnabled={true}
            >
                {/* Sliding Highlight Pill */}
                <Animated.View style={[
                    styles.activeHighlight, 
                    { 
                        width: tabWidth - 10,
                        transform: [{ translateX: scrollX }],
                        backgroundColor: `${activeTheme.colors.primary}25`,
                        borderColor: `${activeTheme.colors.primary}40`,
                    }
                ]} />

                {tabs.map((tab, index) => {
                    const isActive = activeTab === tab.key;
                    const badgeCount = tab.badgeKey ? (unreadCounts?.[tab.badgeKey] || 0) : 0;
                    
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tabItem, { width: tabWidth }]}
                            onPress={() => onTabPress(tab.key)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconContainer}>
                                <Image 
                                    source={isActive ? MENU_ICONS[tab.iconId].active : MENU_ICONS[tab.iconId].inactive} 
                                    style={{ 
                                      width: 22, 
                                      height: 22, 
                                      tintColor: isActive ? activeTheme.colors.primary : activeTheme.colors.textTertiary 
                                    }}
                                    resizeMode="contain"
                                />
                                {badgeCount > 0 && (
                                    <View style={[styles.badgeContainer, { backgroundColor: activeTheme.colors.error, borderColor: activeTheme.colors.background }]}>
                                        <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[
                              styles.tabLabel, 
                              { color: isActive ? activeTheme.colors.primary : activeTheme.colors.textTertiary },
                              isActive && styles.tabLabelActive
                             ]}>
                               {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );
}

const AdminTabNavigator = React.memo(({ onLogout, unreadCounts, onReadChat, onTabChange }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeSubScreen, setActiveSubScreen] = useState(null);
    const insets = useSafeAreaInsets();
    const { theme: activeTheme } = React.useContext(ThemeContext);
    
    // Reset subscreens when switching main tabs
    const handleMainTabPress = useCallback((key, filter) => {
        setActiveTab(key);
        setActiveSubScreen(null);
        if (filter) window.pendingAdminFilter = filter;
        if (onTabChange) onTabChange(key);
    }, [onTabChange]);

    // Expose for child components
    useEffect(() => {
        window.setActiveTab = handleMainTabPress;
    }, [handleMainTabPress]);

    const renderScreen = () => {
        if (activeTab === 'maintenance') {
            switch (activeSubScreen) {
                case 'cleanings':    return <AdminCleaningsTab onBack={() => setActiveSubScreen(null)} />;
                case 'maintenances': return <AdminMaintenancesTab onBack={() => setActiveSubScreen(null)} />;
                case 'blockings':    return <AdminBlockingsTab onBack={() => setActiveSubScreen(null)} />;
                case 'employees':    return <AdminEmployeesTab onBack={() => setActiveSubScreen(null)} />;
                default:             return <AdminOperationalMenu onNavigate={setActiveSubScreen} />;
            }
        }

        switch (activeTab) {
            case 'dashboard':    return <AdminDashboard onLogout={onLogout} />;
            case 'reservations': return <AdminReservationsTab />;
            case 'finance':      return <AdminFinanceTab />;
            case 'users':        return <AdminUsersTab />;
            case 'guests':       return <AdminGuestsTab onBack={() => setActiveTab('dashboard')} />;
            case 'chat':         return <AdminChatTab onRead={onReadChat} />;
            case 'profile':      return <ProfileTab onLogout={onLogout} />;
            default:             return <AdminDashboard onLogout={onLogout} />;
        }
    };

    const onGestureEvent = (event) => {
        if (event.nativeEvent.translationX > 80 && event.nativeEvent.state === State.END) {
            // Swipe Right -> Previous Tab
            const idx = ADMIN_TABS.findIndex(t => t.key === activeTab);
            if (idx > 0) handleMainTabPress(ADMIN_TABS[idx - 1].key);
        } else if (event.nativeEvent.translationX < -80 && event.nativeEvent.state === State.END) {
            // Swipe Left -> Next Tab
            const idx = ADMIN_TABS.findIndex(t => t.key === activeTab);
            if (idx < ADMIN_TABS.length - 1) handleMainTabPress(ADMIN_TABS[idx + 1].key);
        }
    };

    return (
        <GestureHandlerRootView style={styles.appContainer}>
            <PanGestureHandler 
                onHandlerStateChange={onGestureEvent} 
                activeOffsetX={[-30, 30]} // Threshold for horizontal swipe
                failOffsetY={[-15, 15]}    // Threshold for vertical vs horizontal
            >
                <View style={{ flex: 1, paddingTop: insets.top }}>{renderScreen()}</View>
            </PanGestureHandler>
            <TabBar 
                tabs={ADMIN_TABS} 
                activeTab={activeTab} 
                onTabPress={handleMainTabPress} 
                insets={insets} 
                unreadCounts={unreadCounts}
            />
        </GestureHandlerRootView>
    );
});

const OwnerTabNavigator = React.memo(({ onLogout, username, apartments: initialApts = [], unreadCounts, onReadChat, onTabChange }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedApt, setSelectedApt] = useState(initialApts[0] || null);
  const insets = useSafeAreaInsets();
  const { theme: activeTheme } = React.useContext(ThemeContext);

  const handleTabPress = useCallback((key) => {
      setActiveTab(key);
      if (onTabChange) onTabChange(key);
  }, [onTabChange]);

  const renderScreen = () => {
    const commonProps = { username, selectedApartment: selectedApt, navigate: setActiveTab };
    switch (activeTab) {
      case 'dashboard':    return <OwnerDashboard {...commonProps} />;
      case 'reservations': return <ReservationsTab {...commonProps} />;
      case 'calendar':     return <CalendarTab {...commonProps} />;
      case 'chat':         return <ChatTab username={username} selectedApartment={selectedApt} onRead={onReadChat} navigate={setActiveTab} />;
      case 'stats':        return <StatsTab {...commonProps} />;
      case 'profile':      return <ProfileTab onLogout={onLogout} navigate={setActiveTab} />;
      default:             return <OwnerDashboard {...commonProps} />;
    }
  };

  const onGestureEvent = (event) => {
    if (event.nativeEvent.translationX > 80 && event.nativeEvent.state === State.END) {
        const idx = OWNER_TABS.findIndex(t => t.key === activeTab);
        if (idx > 0) handleTabPress(OWNER_TABS[idx - 1].key);
    } else if (event.nativeEvent.translationX < -80 && event.nativeEvent.state === State.END) {
        const idx = OWNER_TABS.findIndex(t => t.key === activeTab);
        if (idx < OWNER_TABS.length - 1) handleTabPress(OWNER_TABS[idx + 1].key);
    }
  };

  return (
    <GestureHandlerRootView style={styles.appContainer}>
      <StatusBar style="light" />
      
      {/* Property Switcher - Header for Owners */}
      {initialApts.length > 1 && (
        <View style={[styles.ownerHeader, { paddingTop: insets.top + 10, backgroundColor: 'transparent' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aptList}>
                {initialApts.map(apt => (
                    <TouchableOpacity 
                        key={apt} 
                        style={[styles.aptBtn, selectedApt === apt && styles.aptBtnActive]}
                        onPress={() => setSelectedApt(apt)}
                    >
                        <Text style={[styles.aptBtnText, selectedApt === apt && styles.aptBtnTextActive]}>
                            Apto {apt}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      )}

      <PanGestureHandler 
        onHandlerStateChange={onGestureEvent}
        activeOffsetX={[-30, 30]}
        failOffsetY={[-15, 15]}
      >
        <View style={{ flex: 1, paddingTop: initialApts.length > 1 ? 0 : insets.top }}>{renderScreen()}</View>
      </PanGestureHandler>

      <TabBar 
        tabs={OWNER_TABS} 
        activeTab={activeTab} 
        onTabPress={handleTabPress} 
        insets={insets} 
        unreadCounts={unreadCounts}
      />
    </GestureHandlerRootView>
  );
});

function AppContent() {
  const activeTabRef = useRef('dashboard');
  const [loading, setLoading]       = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole]     = useState('owner');
  const [username, setUsername]     = useState('');
  const [apartments, setApartments] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({ chat: 0 });
  const [connectionError, setConnectionError] = useState(false);
  const themeCtx = React.useContext(ThemeContext);
  const { theme: activeTheme, appearance, palette } = themeCtx || { 
      theme: THEMES.dark.obsidian, 
      appearance: 'dark', 
      palette: 'obsidian' 
  };
  const isDark = appearance === 'dark';
  const containerStyle = { flex: 1, backgroundColor: 'transparent' };

  const [fontsLoaded] = Font.useFonts({});

  useEffect(() => {
    async function prepare() {
      try {
        await checkAuth();
        try {
          await registerForPushNotificationsAsync();
        } catch (pushError) {
          console.warn('Notification registration failed (likely Expo Go limitation):', pushError);
        }
      } catch (e) {
        console.warn('Initial Auth Check Error:', e);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    }
    prepare();
  }, [checkAuth, registerForPushNotificationsAsync]);

  useEffect(() => {
    if (!loading && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading, fontsLoaded]);

  const registerForPushNotificationsAsync = useCallback(async () => {
    if (!Device.isDevice || Constants.appOwnership === 'expo') return;
    
    try {
        const Notifications = require('expo-notifications');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await AsyncStorage.setItem('@push_token', token);
    } catch (e) { console.error('Push token error:', e); }
  }, []);

  const setupSocket = useCallback((user, role) => {
    try {
        const { io } = require('socket.io-client');
        const { BASE_URL } = require('./src/services/api');
        const socket = io(BASE_URL, { 
            transports: ['websocket'],
            reconnectionAttempts: 5,
            timeout: 10000 
        });
        globalSocket = socket;
        
        socket.on('connect_error', () => setConnectionError(true));
        socket.on('connect', () => setConnectionError(false));

        socket.on('new_message', async (msg) => {
            // Se for para mim (seja eu admin ou owner)
            const isForMe = role === 'admin' ? msg.to === 'admin' : msg.from === 'admin';
            
            if (isForMe) {
                // Se eu já estiver na aba de chat, não incrementamos o marcador visual
                // e marcamos como lida no servidor imediatamente se possível
                if (activeTabRef.current === 'chat') {
                    try {
                        const { api } = require('./src/services/api');
                        await api.post('/messages/read', role === 'admin' ? { from: msg.from } : { from: 'admin' });
                    } catch (e) {}
                    return; 
                }

                setUnreadCounts(prev => ({ ...prev, chat: prev.chat + 1 }));
                
                // Em SDK 53+, notificações no Expo Go podem causar crash. 
                // Disparamos apenas em builds permanentes.
                if (Constants.appOwnership !== 'expo') {
                    try {
                        const Notifications = require('expo-notifications');
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: "🔔 Nova Mensagem",
                                body: `${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`,
                                data: { type: 'chat' },
                            },
                            trigger: null,
                        });
                    } catch (notificationError) {
                        console.warn('Falha ao disparar notificação local:', notificationError);
                    }
                }
            }
        });
    } catch (err) {
        console.error('Socket setup error:', err);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    setConnectionError(false);
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const role  = await AsyncStorage.getItem('@user_role') || 'owner';
      const user  = await AsyncStorage.getItem('@user_username');
      const aptsStr = await AsyncStorage.getItem('@user_apartments');
      const apts = aptsStr ? JSON.parse(aptsStr) : [];

      if (token) {
        setIsLoggedIn(true);
        setUserRole(role);
        setApartments(apts);
        if (user) setUsername(user);
        setupSocket(user, role);
      }
    } catch (e) {
      console.error('Auth check error:', e);
    }
  }, [setupSocket]);

  // Removed redundant duplicate useEffect hook that were calling checkAuth again.

  const handleLogin = useCallback(async () => {
    console.log('--- Processing Login Success ---');
    const role = await AsyncStorage.getItem('@user_role') || 'owner';
    const user = await AsyncStorage.getItem('@user_username') || '';
    const aptsStr = await AsyncStorage.getItem('@user_apartments');
    const apts = aptsStr ? JSON.parse(aptsStr) : [];
    
    console.log(`Setting state -> Role: ${role}, User: ${user}`);
    setUserRole(role);
    setUsername(user);
    setApartments(apts);
    setIsLoggedIn(true);
    setupSocket(user, role);
  }, [setupSocket]);

  const clearChatBadge = useCallback(() => setUnreadCounts(prev => ({ ...prev, chat: 0 })), []);

  const handleTabChange = useCallback((tab) => {
      activeTabRef.current = tab;
      if (tab === 'chat') clearChatBadge();
  }, [clearChatBadge]);

  const handleLogout = useCallback(async () => {
    console.log('--- Logging out ---');
    try {
      if (globalSocket) {
          globalSocket.disconnect();
          globalSocket = null;
      }
      await AsyncStorage.multiRemove(['@auth_token', '@user_role', '@user_username', '@user_apartments', '@user_apartment']);
    } catch (e) {
      console.error('Logout error:', e);
    }
    
    // Reset all auth states explicitly
    setIsLoggedIn(false);
    setUserRole('owner'); 
    setUsername('');
    setApartments([]);
  }, []);

  if (loading) {
    const activeTheme = THEMES[appearance]?.[palette] || THEMES.dark.obsidian;
    return (
      <View style={[styles.loadingContainer, { backgroundColor: activeTheme.colors.background }]}>
        <ActivityIndicator size="large" color={activeTheme.colors.primary} />
      </View>
    );
  }

  if (connectionError) {
      return (
          <View style={[styles.loadingContainer, { backgroundColor: activeTheme.colors.background, padding: 40 }]}>
              <View style={[styles.errorCard, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
                  <View style={[styles.errorIconCircle, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                    <Image source={require('./assets/icons/maintenance_active.png')} style={{ width: 32, height: 32, tintColor: '#ff3b30' }} resizeMode="contain" />
                  </View>
                  <Text style={[styles.errorTitle, { color: activeTheme.colors.text }]}>Falha de Conexão</Text>
                  <Text style={[styles.errorSub, { color: activeTheme.colors.textSecondary }]}>Não foi possível estabelecer contato com o servidor Obsidian.</Text>
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    style={styles.retryBtn} 
                    onPress={checkAuth}
                  >
                        <LinearGradient colors={[activeTheme.colors.primary, '#0055ff']} style={styles.retryGrad}>
                            <Text style={styles.retryText}>TENTAR NOVAMENTE</Text>
                        </LinearGradient>
                  </TouchableOpacity>
              </View>
          </View>
      );
  }

  if (!isLoggedIn) {
      return <LoginScreen navigate={handleLogin} />;
  }

  if (userRole === 'admin') {
      return (
        <View style={containerStyle}>
            <AdminTabNavigator 
                onLogout={handleLogout} 
                unreadCounts={unreadCounts}
                onReadChat={clearChatBadge}
                onTabChange={handleTabChange}
            />
        </View>
      );
  }

  return (
    <View style={containerStyle}>
        <OwnerTabNavigator 
            onLogout={handleLogout} 
            username={username} 
            apartments={apartments} 
            unreadCounts={unreadCounts}
            onReadChat={clearChatBadge}
            onTabChange={handleTabChange}
        />
    </View>
  );
}

export default function App() {
  const [appearance, setAppearance] = useState('dark');
  const [palette, setPalette] = useState('obsidian');
  
  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadThemeSettings = async () => {
    try {
      const savedAppearance = await AsyncStorage.getItem('@user_appearance');
      const savedPalette    = await AsyncStorage.getItem('@user_palette');
      if (savedAppearance) setAppearance(savedAppearance);
      if (savedPalette)    setPalette(savedPalette);
    } catch (e) {}
  };

  const handleSetAppearance = async (val) => {
    setAppearance(val);
    try {
        await AsyncStorage.setItem('@user_appearance', val);
    } catch (e) {}
  };

  const handleSetPalette = async (val) => {
    setPalette(val);
    try {
        await AsyncStorage.setItem('@user_palette', val);
    } catch (e) {}
  };

  // Compatibility toggle
  const toggleTheme = () => handleSetAppearance(appearance === 'dark' ? 'light' : 'dark');

  const activeTheme = THEMES[appearance]?.[palette] || THEMES.dark.obsidian;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TabBarProvider>
        <ThemeContext.Provider value={{ 
            theme: activeTheme, 
            appearance, 
            palette, 
            setAppearance: handleSetAppearance, 
            setPalette: handleSetPalette,
            toggleTheme 
        }}>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </ThemeContext.Provider>
      </TabBarProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#050a14' },
  loadingContainer: { flex: 1, backgroundColor: '#050a14', justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 35,
    height: 68,
    borderRadius: 34,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'hidden',
    shadowOpacity: 0,
    elevation: 0,
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  activeHighlight: {
    position: 'absolute',
    height: 52,
    borderRadius: 26,
    top: 8,
    left: 15,
    borderWidth: 1,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 1 },
  iconContainer: { marginBottom: 2 },
  tabLabel: { fontSize: 10, marginTop: 1, fontWeight: '700', letterSpacing: -0.2 },
  tabLabelActive: { fontWeight: '900' },
  
  badgeContainer: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#050a14',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },

  activeIndicator: {
      position: 'absolute',
      bottom: 0,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#3b82f6',
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 5
  },
  ownerHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 15,
  },
  aptList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  aptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  aptBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  aptBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  aptBtnTextActive: {
    color: '#fff',
  }
});
