import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView,
  ActivityIndicator, RefreshControl, Dimensions,
  Platform, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { formatDateBR } from '../utils/dateUtils';
import { ThemeContext } from '../styles/ThemeContext';
import MeshBackground from '../components/MeshBackground';
import { useTabBarScroll } from '../hooks/useTabBarScroll';

// Modals
import RequestReservationModal from './owner/RequestReservationModal';
import AddGuestModal from './owner/AddGuestModal';

const { width, height } = Dimensions.get('window');

function ReservationCard({ item, activeTheme }) {
  const STATUS_CONFIG = {
    'confirmed':        { label: 'Confirmada',   color: activeTheme.colors.secondary, bg: `${activeTheme.colors.secondary}20`, icon: require('../../assets/icons/check_active.png') },
    'pending':          { label: 'Pendente',     color: activeTheme.colors.warning, bg: `${activeTheme.colors.warning}20`, icon: require('../../assets/icons/bulb_active.png') },
    'pending-approval': { label: 'Aguardando',   color: activeTheme.colors.warning, bg: `${activeTheme.colors.warning}20`, icon: require('../../assets/icons/bulb_active.png') },
    'checked-in':       { label: 'Check-in',     color: activeTheme.colors.primary, bg: `${activeTheme.colors.primary}20`, icon: require('../../assets/icons/person_active.png') },
    'checked-out':      { label: 'Check-out',    color: activeTheme.colors.accent, bg: `${activeTheme.colors.accent}20`, icon: require('../../assets/icons/logout_active.png') },
    'canceled':         { label: 'Cancelada',    color: activeTheme.colors.error, bg: `${activeTheme.colors.error}20`, icon: require('../../assets/icons/trash_active.png') },
    'cleaning':         { label: 'Limpeza',      color: activeTheme.colors.primary, bg: `${activeTheme.colors.primary}20`, icon: require('../../assets/icons/cleaning_active.png') },
  };

  const status = STATUS_CONFIG[item.status] || { 
    label: item.status, 
    color: activeTheme.colors.textSecondary, 
    bg: activeTheme.colors.glassSecondary, 
    icon: require('../../assets/icons/reservations_active.png'),
    tint: activeTheme.colors.textSecondary 
  };
  
  return (
    <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.cardAptBadge, { backgroundColor: activeTheme.colors.glassSecondary }]}>
                    <Text style={[styles.cardAptText, { color: activeTheme.colors.primary }]}># {item.apartment || '—'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.color }]}>{status.label.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.mainInfo}>
                <View style={[styles.statusIconWrap, { backgroundColor: status.bg }]}>
                    <Image source={status.icon} style={{ width: 22, height: 22, tintColor: status.color || status.tint }} resizeMode="contain" />
                </View>
                <Text style={[styles.guestName, { color: activeTheme.colors.text }]} numberOfLines={1}>
                    {item.guestName || 'Reserva Disponível'}
                </Text>
            </View>

            <View style={[styles.cardFooter, { borderTopColor: 'rgba(255,255,255,0.05)' }]}>
                <View style={styles.dateInfo}>
                    <View style={[styles.iconCircle, { backgroundColor: activeTheme.colors.primary + '15' }]}>
                        <Image source={require('../../assets/icons/calendar_active.png')} style={{ width: 12, height: 12, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                    </View>
                    <Text style={[styles.dateText, { color: activeTheme.colors.textSecondary }]}>{formatDateBR(item.startDate)} — {formatDateBR(item.endDate)}</Text>
                </View>
                {item.price ? (
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceSymbol, { color: activeTheme.colors.secondary }]}>R$</Text>
                        <Text style={[styles.priceValue, { color: activeTheme.colors.secondary }]}>{Number(item.price).toLocaleString('pt-BR')}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    </View>
  );
}

export default function OwnerDashboard({ navigate }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const { handleScroll } = useTabBarScroll();

  const [username, setUsername] = useState('Proprietário');
  const [apartment, setApartment] = useState('');
  const [allApartments, setAllApartments] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const aptsJson = await AsyncStorage.getItem('@user_apartments');
      const savedUser = await AsyncStorage.getItem('@user_username');

      if (savedUser) setUsername(savedUser);
      const apts = aptsJson ? JSON.parse(aptsJson) : [];
      setAllApartments(apts);

      if (!apartment && apts.length > 0) {
        setApartment(apts[0]);
      }

      const res = await api.get('/reservations');
      setReservations(res.data || []);
    } catch (error) {
      console.error('Owner Load Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apartment]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- CALCULATIONS ---
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filtered = apartment ? reservations.filter(r => r.apartment === apartment) : reservations;
    
    // Monthly Revenue (Confirmed/Check-in/Check-out in current month)
    const revenue = filtered.reduce((acc, res) => {
      const start = new Date(res.startDate);
      if (start.getMonth() === currentMonth && start.getFullYear() === currentYear && ['confirmed', 'checked-in', 'checked-out'].includes(res.status)) {
        return acc + (Number(res.price) || 0);
      }
      return acc;
    }, 0);

    // Occupancy (Days booked in current month)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const bookedDays = new Array(daysInMonth).fill(false);
    
    filtered.forEach(res => {
      if (res.status === 'canceled') return;
      const start = new Date(res.startDate);
      const end = new Date(res.endDate);
      
      for (let d = 1; d <= daysInMonth; d++) {
        const currentD = new Date(currentYear, currentMonth, d);
        if (currentD >= start && currentD <= end) {
          bookedDays[d-1] = true;
        }
      }
    });
    
    const occupancyCount = bookedDays.filter(Boolean).length;
    const occupancyRate = (occupancyCount / daysInMonth) * 100;

    return {
      revenue,
      occupancyRate,
      confirmed: filtered.filter(r => r.status === 'confirmed').length,
      pending: filtered.filter(r => r.status === 'pending' || r.status === 'pending-approval').length,
      canceled: filtered.filter(r => r.status === 'canceled').length,
      active: filtered.filter(r => r.status === 'checked-in').length
    };
  }, [reservations, apartment]);

  // Statistics for the last 6 months (Simulated for visual)
  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const last6 = [];
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mIdx = d.getMonth();
        const mLabel = months[mIdx];
        
        // Count reservations in this month
        const count = reservations.filter(r => {
            const rStart = new Date(r.startDate);
            return rStart.getMonth() === mIdx && rStart.getFullYear() === d.getFullYear() && r.status !== 'canceled';
        }).length;
        
        last6.push({ label: mLabel, value: Math.min(count * 20, 100), actual: count }); // actual count, max 5 for visual scaling
    }
    return last6;
  }, [reservations]);

  const filteredList = useMemo(() => {
    let list = apartment ? reservations.filter(r => r.apartment === apartment) : reservations;
    if (selectedStatus !== 'all') {
        list = list.filter(r => r.status === selectedStatus);
    }
    // Return chronological
    return list.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [reservations, apartment, selectedStatus]);

  const handleGenerateReport = () => {
    const reportText = filteredList.map(r => 
        `Unidade: ${r.apartment} | Hóspede: ${r.guestName} | Período: ${formatDateBR(r.startDate)} a ${formatDateBR(r.endDate)} | Valor: R$${r.price || 0} | Status: ${r.status}`
    ).join('\n---\n');
    
    Alert.alert(
        'Relatório de Estadias',
        `Resumo gerado com ${filteredList.length} registros.\nDeseja copiar as informações?`,
        [
            { text: 'Fechar', style: 'cancel' },
            { text: 'Visualizar', onPress: () => Alert.alert('Conteúdo do Relatório', reportText) }
        ]
    );
  };

  if (loading) {
    return (
        <View style={[styles.centered, { backgroundColor: activeTheme.colors.background }]}>
            <ActivityIndicator size="small" color={activeTheme.colors.primary} />
        </View>
    );
  }

  return (
    <View style={styles.container}>
      <MeshBackground colors={activeTheme.colors.mesh} />
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* HEADER */}
      <View style={[styles.floatingHeader]} pointerEvents="box-none">
        <BlurView 
            intensity={Platform.OS === 'ios' ? 80 : 30} 
            tint={isDark ? "dark" : "light"} 
            style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: isDark ? 'rgba(5, 10, 20, 0.85)' : 'rgba(242, 242, 247, 0.85)' }]} 
        />
        <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
                <View>
                    <Text style={[styles.headerWelcome, { color: activeTheme.colors.primary }]}>PORTAL DO PROPRIETÁRIO</Text>
                    <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]} numberOfLines={1}>Olá, {username}</Text>
                </View>
                <TouchableOpacity 
                    activeOpacity={0.7}
                    style={styles.profileBtn} 
                    onPress={() => navigate && navigate('profile')}
                >
                    <LinearGradient
                        colors={[activeTheme.colors.glassSecondary, activeTheme.colors.glass]}
                        style={[styles.profileCircle, { borderColor: activeTheme.colors.glassBorder }]}
                    >
                        <Image source={require('../../assets/icons/profile_active.png')} style={{ width: 22, height: 22, tintColor: activeTheme.colors.primary}} resizeMode="contain" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
        {/* Scroll Mask - Gradiente para desvanecer o conteúdo no topo */}
        <LinearGradient
            colors={[activeTheme.colors.background, 'transparent']}
            style={{ position: 'absolute', bottom: -60, left: 0, right: 0, height: 60 }}
            pointerEvents="none"
        />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={activeTheme.colors.primary} />}
      >
        <View style={styles.topSpacer} />

        {/* APARTMENT SWITCHER */}
        {allApartments.length > 1 && (
            <View style={styles.switcherContainer}>
                <Text style={[styles.sectionCaption, { color: activeTheme.colors.textTertiary }]}>SUAS UNIDADES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherList}>
                    {allApartments.map(item => (
                        <TouchableOpacity 
                            key={item}
                            activeOpacity={0.8}
                            onPress={() => setApartment(item)}
                            style={[
                                styles.aptChip,
                                { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder },
                                apartment === item && [styles.aptChipActive, { backgroundColor: activeTheme.colors.primary, borderColor: activeTheme.colors.primary }]
                            ]}
                        >
                            <Text style={[
                                styles.aptChipText,
                                { color: activeTheme.colors.textSecondary },
                                apartment === item && styles.aptChipTextActive
                            ]}>Apto {item}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        )}

        {/* FINANCIAL METRICS GRID */}
        <View style={styles.metricsGrid}>
            <LinearGradient
                colors={['rgba(52, 211, 153, 0.15)', 'rgba(52, 211, 153, 0.05)']}
                style={[styles.metricCard, { borderColor: 'rgba(52, 211, 153, 0.3)' }]}
            >
                <View style={styles.metricHeader}>
                    <Ionicons name="cash-outline" size={18} color="#34d399" />
                    <Text style={[styles.metricTitle, { color: '#34d399' }]}>RENDA MENSAL</Text>
                </View>
                <Text style={[styles.metricValue, { color: activeTheme.colors.text }]}>
                    R$ {metrics.revenue.toLocaleString('pt-BR')}
                </Text>
                <Text style={[styles.metricSub, { color: activeTheme.colors.textTertiary }]}>Mês Corrente</Text>
            </LinearGradient>

            <LinearGradient
                colors={['rgba(0, 85, 255, 0.15)', 'rgba(0, 85, 255, 0.05)']}
                style={[styles.metricCard, { borderColor: 'rgba(0, 85, 255, 0.3)' }]}
            >
                <View style={styles.metricHeader}>
                    <Ionicons name="pie-chart-outline" size={18} color="#0055ff" />
                    <Text style={[styles.metricTitle, { color: '#0055ff' }]}>OCUPAÇÃO</Text>
                </View>
                <Text style={[styles.metricValue, { color: activeTheme.colors.text }]}>
                    {metrics.occupancyRate.toFixed(1)}%
                </Text>
                <Text style={[styles.metricSub, { color: activeTheme.colors.textTertiary }]}>Taxa de Uso</Text>
            </LinearGradient>
        </View>

        {/* QUICK SHORTCUTS */}
        <View style={styles.shortcutsSection}>
            <Text style={[styles.sectionCaption, { color: activeTheme.colors.textTertiary }]}>ATALHOS RÁPIDOS</Text>
            <View style={styles.shortcutRow}>
                <TouchableOpacity style={styles.shortcutItem} onPress={() => setShowAddGuestModal(true)}>
                    <View style={[styles.shortcutIcon, { backgroundColor: activeTheme.colors.secondary + '20' }]}>
                        <Ionicons name="person-add-outline" size={24} color={activeTheme.colors.secondary} />
                    </View>
                    <Text style={[styles.shortcutText, { color: activeTheme.colors.text }]}>Novo Hóspede</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shortcutItem} onPress={() => setShowRequestModal(true)}>
                    <View style={[styles.shortcutIcon, { backgroundColor: activeTheme.colors.primary + '20' }]}>
                        <Ionicons name="calendar-outline" size={24} color={activeTheme.colors.primary} />
                    </View>
                    <Text style={[styles.shortcutText, { color: activeTheme.colors.text }]}>Nova Reserva</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shortcutItem} onPress={handleGenerateReport}>
                    <View style={[styles.shortcutIcon, { backgroundColor: activeTheme.colors.accent + '20' }]}>
                        <Ionicons name="document-text-outline" size={24} color={activeTheme.colors.accent} />
                    </View>
                    <Text style={[styles.shortcutText, { color: activeTheme.colors.text }]}>Relatórios</Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* PERFORMANCE CHART */}
        <View style={styles.chartSection}>
            <View style={styles.chartHeaderRow}>
                <Text style={[styles.sectionCaption, { color: activeTheme.colors.textTertiary }]}>DESEMPENHO UNITÁRIO</Text>
                <Text style={[styles.chartLegend, { color: activeTheme.colors.primary }]}>RESERVAS/MÊS</Text>
            </View>
            <View style={[styles.chartBox, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
                <View style={styles.chartRow}>
                    {chartData.map((d, i) => (
                        <View key={i} style={styles.chartCol}>
                            <View style={styles.barContainer}>
                                <LinearGradient 
                                    colors={i === 5 ? [activeTheme.colors.primary, '#0055ff'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                    style={[styles.bar, { height: `${Math.max(d.value, 15)}%` }]}
                                />
                                <Text style={[styles.barValue, { color: activeTheme.colors.text }]}>{d.actual}</Text>
                            </View>
                            <Text style={[styles.barLabel, { color: activeTheme.colors.textTertiary }]}>{d.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>

        {/* STATUS COUNTERS / FILTER */}
        <View style={styles.statusSection}>
            <Text style={[styles.sectionCaption, { color: activeTheme.colors.textTertiary, marginBottom: 15 }]}>SITUAÇÃO DAS RESERVAS</Text>
            <View style={styles.statusRow}>
                <StatusPill 
                    label="Confirmadas" 
                    count={metrics.confirmed} 
                    color={activeTheme.colors.secondary} 
                    active={selectedStatus === 'confirmed'}
                    onPress={() => setSelectedStatus(selectedStatus === 'confirmed' ? 'all' : 'confirmed')}
                />
                <StatusPill 
                    label="Pendentes" 
                    count={metrics.pending} 
                    color={activeTheme.colors.warning} 
                    active={selectedStatus === 'pending'}
                    onPress={() => setSelectedStatus(selectedStatus === 'pending' ? 'all' : 'pending')}
                />
                <StatusPill 
                    label="Canceladas" 
                    count={metrics.canceled} 
                    color={activeTheme.colors.error} 
                    active={selectedStatus === 'canceled'}
                    onPress={() => setSelectedStatus(selectedStatus === 'canceled' ? 'all' : 'canceled')}
                />
            </View>
        </View>

        {/* RECENT ACTIVITY LIST */}
        <View style={styles.activitySection}>
            <View style={styles.activityHeader}>
                <Text style={[styles.sectionCaption, { color: activeTheme.colors.textTertiary }]}>ATIVIDADE RECENTE</Text>
                <TouchableOpacity onPress={() => setSelectedStatus('all')}>
                    <Text style={{ color: activeTheme.colors.primary, fontSize: 12, fontWeight: '700' }}>Ver Tudo</Text>
                </TouchableOpacity>
            </View>
            
            {filteredList.length > 0 ? (
                filteredList.slice(0, 10).map((item) => (
                    <ReservationCard key={item.id || item._id} item={item} activeTheme={activeTheme} />
                ))
            ) : (
                <View style={styles.emptyActivity}>
                    <Ionicons name="calendar-clear-outline" size={40} color={activeTheme.colors.textTertiary} style={{ opacity: 0.3 }} />
                    <Text style={{ color: activeTheme.colors.textTertiary, marginTop: 10 }}>Nenhum registro para este filtro.</Text>
                </View>
            )}
        </View>
      </ScrollView>

      {/* MODALS */}
      <RequestReservationModal 
          visible={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          onSuccess={loadData}
          apartment={apartment}
      />
      <AddGuestModal 
          visible={showAddGuestModal}
          onClose={() => setShowAddGuestModal(false)}
          onSuccess={() => {
              setShowAddGuestModal(false);
              loadData();
          }}
      />
    </View>
  );
}

function StatusPill({ label, count, color, active, onPress }) {
    return (
        <TouchableOpacity 
            activeOpacity={0.7}
            onPress={onPress}
            style={[
                styles.statusPill, 
                { backgroundColor: color + '10', borderColor: color + '30' },
                active && { backgroundColor: color, borderColor: color }
            ]}
        >
            <View style={[styles.dot, { backgroundColor: active ? '#fff' : color }]} />
            <Text style={[styles.pillLabel, { color: active ? '#fff' : color }]}>{label}</Text>
            <Text style={[styles.pillCount, { color: active ? '#fff' : color }]}>{count}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingBottom: 120 },
  topSpacer: { height: height * 0.16 },

  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerWelcome: { fontSize: 10, fontWeight: '900', letterSpacing: 2, opacity: 0.6 },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, maxWidth: width * 0.7 },
  profileCircle: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
  },
  
  sectionCaption: { 
    fontSize: 10, 
    fontWeight: '900', 
    paddingHorizontal: 25, 
    letterSpacing: 2,
    textTransform: 'uppercase'
  },

  switcherContainer: { marginBottom: 30 },
  switcherList: { paddingHorizontal: 25, gap: 12, marginTop: 12 },
  aptChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  aptChipActive: {},
  aptChipText: { fontSize: 14, fontWeight: '700' },
  aptChipTextActive: { color: '#fff', fontWeight: '900' },

  metricsGrid: { flexDirection: 'row', gap: 15, paddingHorizontal: 25, marginBottom: 30 },
  metricCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  metricTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  metricValue: { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  metricSub: { fontSize: 10, fontWeight: '700', marginTop: 4, opacity: 0.5 },

  shortcutsSection: { marginBottom: 35 },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginTop: 15 },
  shortcutItem: { alignItems: 'center', width: (width - 50) / 3.5 },
  shortcutIcon: { 
    width: 56, 
    height: 56, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 10 
  },
  shortcutText: { fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 14 },

  chartSection: { paddingHorizontal: 25, marginBottom: 35 },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  chartLegend: { fontSize: 9, fontWeight: '900' },
  chartBox: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  chartCol: { alignItems: 'center', flex: 1 },
  barContainer: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  bar: { width: 12, borderRadius: 6 },
  barValue: { fontSize: 8, fontWeight: '900' },
  barLabel: { fontSize: 9, fontWeight: '700', marginTop: 8 },

  statusSection: { marginBottom: 35 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 25 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillLabel: { fontSize: 11, fontWeight: '800' },
  pillCount: { fontSize: 11, fontWeight: '900', opacity: 0.6 },

  activitySection: { paddingHorizontal: 0 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 15 },
  emptyActivity: { alignItems: 'center', paddingVertical: 40, opacity: 0.5 },

  cardWrapper: {
    marginHorizontal: 25,
    marginBottom: 15,
    borderRadius: 24,
  },
  card: { 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardAptBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardAptText: { fontSize: 10, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 8, fontWeight: '900' },
  mainInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  statusIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  guestName: { flex: 1, fontSize: 18, fontWeight: '800' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconCircle: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dateText: { fontSize: 12, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceSymbol: { fontSize: 10, fontWeight: '700' },
  priceValue: { fontSize: 16, fontWeight: '800' },
});
