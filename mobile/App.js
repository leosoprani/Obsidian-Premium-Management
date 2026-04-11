import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, Platform, ScrollView, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

import LoginScreen from './src/screens/LoginScreen';
import { lightTheme, darkTheme } from './src/styles/theme';
import { ThemeContext } from './src/styles/ThemeContext';
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

import ReservationsTab from './src/screens/owner/ReservationsTab';
import ChatTab from './src/screens/owner/ChatTab';
import StatsTab from './src/screens/owner/StatsTab';
import ProfileTab from './src/screens/owner/ProfileTab';
import CalendarTab from './src/screens/owner/CalendarTab';

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

const ADMIN_TABS = [
  { key: 'dashboard',   iconId: 'dashboard',    label: 'Dash' },
  { key: 'reservations',iconId: 'reservations', label: 'Reservas', badgeKey: 'reservations' },
  { key: 'maintenance', iconId: 'maintenance',  label: 'Manut.' },
  { key: 'finance',     iconId: 'finance',      label: 'Financeiro' },
  { key: 'users',       iconId: 'accesses',     label: 'Acessos' },
  { key: 'profile',     iconId: 'profile',      label: 'Ações' },
];

const OWNER_TABS = [
  { key: 'reservations', iconId: 'reservations', label: 'Lista' },
  { key: 'calendar',     iconId: 'calendar',     label: 'Agenda' },
  { key: 'chat',         iconId: 'chat',         label: 'Chat', badgeKey: 'chat' },
  { key: 'stats',        iconId: 'stats',        label: 'Gráficos' },
  { key: 'profile',      iconId: 'profile',      label: 'Perfil' },
];

function TabBar({ tabs, activeTab, onTabPress, insets, unreadCounts }) {
    const bottomPad = insets.bottom > 0 ? insets.bottom : 10;
    return (
        <BlurView intensity={35} tint="dark" style={[styles.tabBar, { height: 65 + bottomPad, paddingBottom: bottomPad }]}>
            {tabs.map(tab => {
                const isActive = activeTab === tab.key;
                const badgeCount = tab.badgeKey ? (unreadCounts?.[tab.badgeKey] || 0) : 0;
                
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.tabItem}
                        onPress={() => onTabPress(tab.key)}
                        activeOpacity={0.7}
                    >
                        <View>
                            <Image 
                                source={isActive ? MENU_ICONS[tab.iconId].active : MENU_ICONS[tab.iconId].inactive} 
                                style={{ width: 24, height: 24 }}
                                resizeMode="contain"
                            />
                            {badgeCount > 0 && (
                                <View style={styles.badgeContainer}>
                                    <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                        {isActive && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                );
            })}
        </BlurView>
    );
}

function AdminTabNavigator({ onLogout }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeSubScreen, setActiveSubScreen] = useState(null);
    const insets = useSafeAreaInsets();
    
    // Reset subscreens when switching main tabs
    const handleMainTabPress = (key, filter) => {
        setActiveTab(key);
        setActiveSubScreen(null);
        if (filter) window.pendingAdminFilter = filter;
    };

    // Expose for child components
    useEffect(() => {
        window.setActiveTab = handleMainTabPress;
    }, []);

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
            case 'chat':         return <ChatTab username="admin" />;
            case 'profile':      return <ProfileTab onLogout={onLogout} />;
            default:             return <AdminDashboard onLogout={onLogout} />;
        }
    };

    return (
        <View style={styles.appContainer}>
            <View style={{ flex: 1, paddingTop: insets.top }}>{renderScreen()}</View>
            <TabBar tabs={ADMIN_TABS} activeTab={activeTab} onTabPress={handleMainTabPress} insets={insets} />
        </View>
    );
}

function OwnerTabNavigator({ onLogout, username, apartments: initialApts = [], unreadCounts, onReadChat }) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedApt, setSelectedApt] = useState(initialApts[0] || null);
  const insets = useSafeAreaInsets();

  const renderScreen = () => {
    const commonProps = { username, selectedApartment: selectedApt };
    switch (activeTab) {
      case 'reservations': return <ReservationsTab {...commonProps} />;
      case 'calendar':     return <CalendarTab {...commonProps} />;
      case 'chat':         return <ChatTab username={username} selectedApartment={selectedApt} onRead={onReadChat} />;
      case 'stats':        return <StatsTab {...commonProps} />;
      case 'profile':      return <ProfileTab onLogout={onLogout} />;
      default:             return <ReservationsTab {...commonProps} />;
    }
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />
      
      {/* Property Switcher - Header for Owners */}
      {initialApts.length > 1 && (
        <BlurView intensity={30} tint="dark" style={[styles.ownerHeader, { paddingTop: insets.top + 10 }]}>
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
        </BlurView>
      )}

      <View style={{ flex: 1, paddingTop: initialApts.length > 1 ? 0 : insets.top }}>{renderScreen()}</View>
      <TabBar 
        tabs={OWNER_TABS} 
        activeTab={activeTab} 
        onTabPress={setActiveTab} 
        insets={insets} 
        unreadCounts={unreadCounts}
      />
    </View>
  );
}

function AppContent() {
  const [loading, setLoading]       = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole]     = useState('owner');
  const [username, setUsername]     = useState('');
  const [apartments, setApartments] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({ chat: 0 });
  const socketRef = useRef(null);
  const themeCtx = React.useContext(ThemeContext);
  const { theme, isDark, toggleTheme } = themeCtx || { theme: darkTheme, isDark: true };

  const [fontsLoaded] = Font.useFonts({
      // We no longer need Ionicons font
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Authenticate
        await checkAuth();
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    prepare();
  }, []);

  // Dismiss splash screen only when everything is ready
  useEffect(() => {
    if (!loading && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading, fontsLoaded]);

  const checkAuth = async () => {
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
        
        // Setup global notification socket for owners
        if (role === 'owner') {
           setupSocket(user);
        }
      }
    } catch (e) {
      console.error('Auth check error:', e);
    }
  };

  const handleLogin = async () => {
    const role = await AsyncStorage.getItem('@user_role') || 'owner';
    const user = await AsyncStorage.getItem('@user_username') || '';
    const aptsStr = await AsyncStorage.getItem('@user_apartments');
    const apts = aptsStr ? JSON.parse(aptsStr) : [];
    
    setUserRole(role);
    setUsername(user);
    setApartments(apts);
    setIsLoggedIn(true);
    
    if (role === 'owner') {
        setupSocket(user);
    }
  };

  const setupSocket = (user) => {
    try {
        const { io } = require('socket.io-client');
        const { BASE_URL } = require('./src/services/api');
        const socket = io(BASE_URL, { transports: ['websocket'] });
        socketRef.current = socket;
        
        socket.on('new_message', (msg) => {
            // Se for para mim vindo do admin
            if (msg.from === 'admin') {
                setUnreadCounts(prev => ({ ...prev, chat: prev.chat + 1 }));
                // Opcional: Alerta visual se no estiver no chat
                // Usamos uma referncia global ou estado para saber a tab atual?
                // For simplified UX, we just show a subtle alert if it's a new message
                Alert.alert('🔔 Nova Mensagem', `Suporte: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`);
            }
        });
    } catch (err) {
        console.error('Socket setup error:', err);
    }
  };

  const clearChatBadge = () => setUnreadCounts(prev => ({ ...prev, chat: 0 }));

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['@auth_token', '@user_role', '@user_username', '@user_apartments', '@user_apartment']);
    } catch (e) {}
    setIsLoggedIn(false);
    setUsername('');
    setApartments([]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!isLoggedIn) {
      return <LoginScreen navigate={handleLogin} />;
  }

  const containerStyle = { flex: 1, backgroundColor: theme.colors.background };

  if (userRole === 'admin') {
      return <View style={containerStyle}><AdminTabNavigator onLogout={handleLogout} /></View>;
  }

  return (
    <View style={containerStyle}>
        <OwnerTabNavigator 
            onLogout={handleLogout} 
            username={username} 
            apartments={apartments} 
            unreadCounts={unreadCounts}
            onReadChat={clearChatBadge}
        />
    </View>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('@user_theme');
      if (saved) setIsDark(saved === 'dark');
    } catch (e) {}
  };

  const toggleTheme = async () => {
    const newVal = !isDark;
    setIsDark(newVal);
    try {
        await AsyncStorage.setItem('@user_theme', newVal ? 'dark' : 'light');
    } catch (e) {}
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#050a14' },
  loadingContainer: { flex: 1, backgroundColor: '#050a14', justifyContent: 'center', alignItems: 'center' },
  
  tabBar: {
    backgroundColor: 'rgba(5, 10, 20, 0.95)', // Slightly solid for better contrast when not absolute
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  tabLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '600' },
  tabLabelActive: { color: '#3b82f6', fontWeight: '800' },
  
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
