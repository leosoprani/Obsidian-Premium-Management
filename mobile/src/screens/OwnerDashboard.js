import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ActivityIndicator, RefreshControl, SafeAreaView, Dimensions,
  Platform, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../services/api';
import { theme } from '../styles/theme';
import { ThemeContext } from '../styles/ThemeContext';

const { width, height } = Dimensions.get('window');

function ReservationCard({ item, activeTheme }) {
  const STATUS_CONFIG = {
    'confirmed':        { label: 'Confirmada',   color: activeTheme.colors.secondary, bg: `${activeTheme.colors.secondary}20` },
    'pending':          { label: 'Pendente',     color: activeTheme.colors.warning, bg: `${activeTheme.colors.warning}20` },
    'pending-approval': { label: 'Aguardando',   color: activeTheme.colors.warning, bg: `${activeTheme.colors.warning}20` },
    'checked-in':       { label: 'Check-in',     color: activeTheme.colors.primary, bg: `${activeTheme.colors.primary}20` },
    'checked-out':      { label: 'Check-out',    color: activeTheme.colors.accent, bg: `${activeTheme.colors.accent}20` },
    'canceled':         { label: 'Cancelada',    color: activeTheme.colors.error, bg: `${activeTheme.colors.error}20` },
    'cleaning':         { label: 'Limpeza',      color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.2)' },
  };

  const status = STATUS_CONFIG[item.status] || { label: item.status, color: activeTheme.colors.textSecondary, bg: activeTheme.colors.glassSecondary };
  
  return (
    <BlurView intensity={20} tint={activeTheme.colors.background === '#0a0a0c' ? 'dark' : 'light'} style={[styles.card, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardAptBadge, { backgroundColor: activeTheme.colors.glassSecondary }]}>
            <Text style={[styles.cardAptText, { color: activeTheme.colors.primary }]}># {item.apartment || '—'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={[styles.guestName, { color: activeTheme.colors.text }]} numberOfLines={1}>
        {item.guestName || 'Reserva Disponível'}
      </Text>

      <View style={[styles.cardFooter, { borderTopColor: activeTheme.colors.border }]}>
        <View style={styles.dateInfo}>
            <View style={[styles.iconCircle, { backgroundColor: activeTheme.colors.primary + '15' }]}>
                <Image source={require('../assets/icons/reservations_active.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
            </View>
            <Text style={[styles.dateText, { color: activeTheme.colors.textSecondary }]}>{formatDate(item.startDate)} — {formatDate(item.endDate)}</Text>
        </View>
        {item.price ? (
            <View style={styles.priceRow}>
                <Text style={[styles.priceSymbol, { color: activeTheme.colors.secondary }]}>R$</Text>
                <Text style={[styles.priceValue, { color: activeTheme.colors.secondary }]}>{Number(item.price).toLocaleString('pt-BR')}</Text>
            </View>
        ) : null}
      </View>
    </BlurView>
  );
}

export default function OwnerDashboard({ navigate }) {
  const [apartment, setApartment] = useState('');
  const [allApartments, setAllApartments] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);

  const loadData = useCallback(async () => {
    try {
      const aptsJson = await AsyncStorage.getItem('@user_apartments');
      const apts = aptsJson ? JSON.parse(aptsJson) : [];
      setAllApartments(apts);

      let currentApt = apartment;
      if (!currentApt && apts.length > 0) {
        currentApt = apts[0];
        setApartment(currentApt);
      }

      const res = await api.get('/reservations');
      const sorted = res.data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setReservations(sorted);
      
      if (currentApt) {
        setFilteredReservations(sorted.filter(r => r.apartment === currentApt));
      } else {
        setFilteredReservations(sorted);
      }

    } catch (error) {
      console.error('Owner Load Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apartment]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (apartment) {
        setFilteredReservations(reservations.filter(r => r.apartment === apartment));
    }
  }, [apartment, reservations]);

  if (loading) {
    return (
        <View style={[styles.centered, { backgroundColor: activeTheme.colors.background }]}>
            <ActivityIndicator size="small" color={activeTheme.colors.primary} />
        </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[styles.floatingHeader, { borderBottomColor: activeTheme.colors.border }]}>
        <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
                <View>
                    <Text style={[styles.headerWelcome, { color: activeTheme.colors.primary }]}>BEM-VINDO</Text>
                    <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>Proprietário</Text>
                </View>
                <TouchableOpacity 
                    activeOpacity={0.7}
                    style={styles.profileBtn} 
                    onPress={() => navigate('Profile')}
                >
                    <LinearGradient
                        colors={[activeTheme.colors.glassSecondary, activeTheme.colors.glass]}
                        style={[styles.profileCircle, { borderColor: activeTheme.colors.border }]}
                    >
                        <Image source={require('../assets/icons/profile_active.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
      </BlurView>

      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id || item._id}
        renderItem={({ item }) => <ReservationCard item={item} activeTheme={activeTheme} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={loadData} 
                tintColor={activeTheme.colors.primary} 
            />
        }
        ListHeaderComponent={
          <View style={styles.topSection}>
            {allApartments.length > 1 && (
                <View style={styles.switcherContainer}>
                    <Text style={[styles.switcherTitle, { color: activeTheme.colors.textTertiary }]}>SUAS UNIDADES</Text>
                    <FlatList 
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={allApartments}
                        keyExtractor={item => item}
                        contentContainerStyle={styles.switcherList}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                activeOpacity={0.8}
                                onPress={() => setApartment(item)}
                                style={[
                                    styles.aptChip,
                                    { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border },
                                    apartment === item && [styles.aptChipActive, { backgroundColor: activeTheme.colors.primary, borderColor: activeTheme.colors.primary }]
                                ]}
                            >
                                <Text style={[
                                    styles.aptChipText,
                                    { color: activeTheme.colors.textSecondary },
                                    apartment === item && styles.aptChipTextActive
                                ]}>Apto {item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            <View style={styles.statsGrid}>
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.statBox, { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.glass }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: activeTheme.colors.primary + '20' }]}>
                        <Image source={require('../assets/icons/dots_active.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                    </View>
                    <Text style={[styles.statValue, { color: activeTheme.colors.text }]}>{filteredReservations.length}</Text>
                    <Text style={[styles.statLabel, { color: activeTheme.colors.textTertiary }]}>RESERVAS</Text>
                </BlurView>
                
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.statBox, { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.glass }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: activeTheme.colors.secondary + '20' }]}>
                        <Image source={require('../assets/icons/check_active.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                    </View>
                    <Text style={[styles.statValue, { color: activeTheme.colors.secondary }]}>
                        {filteredReservations.filter(r => r.status === 'confirmed').length}
                    </Text>
                    <Text style={[styles.statLabel, { color: activeTheme.colors.textTertiary }]}>COFIRMADO</Text>
                </BlurView>
            </View>
            
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: activeTheme.colors.textSecondary }]}>ATIVIDADE RECENTE</Text>
                <View style={[styles.sectionLine, { backgroundColor: activeTheme.colors.border }]} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={[styles.emptyCard, { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.glass }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: activeTheme.colors.glass }]}>
                <Image source={require('../assets/icons/reservations_inactive.png')} style={{ width: 40, height: 40, opacity: 0.3 }} resizeMode="contain" />
            </View>
            <Text style={[styles.emptyText, { color: activeTheme.colors.text }]}>Sem reservas ativas</Text>
            <Text style={[styles.emptySub, { color: activeTheme.colors.textTertiary }]}>Toque no botão abaixo para adicionar nova ocupação.</Text>
          </BlurView>
        }
      />

      <TouchableOpacity 
          activeOpacity={0.9}
          style={[styles.fab, activeTheme.shadows.primary]} 
          onPress={() => navigate('NewReservation')}
      >
        <LinearGradient
            colors={[activeTheme.colors.primary, '#0055ff']}
            style={styles.fabGradient}
        >
            <Image source={require('../assets/icons/add_white.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerWelcome: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  profileCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
  },
  
  topSection: { paddingTop: height * 0.18, paddingBottom: 20 },
  
  switcherContainer: { marginBottom: 30 },
  switcherTitle: { 
    fontSize: 10, 
    fontWeight: '900', 
    paddingHorizontal: 25, 
    marginBottom: 12, 
    letterSpacing: 1.5 
  },
  switcherList: { paddingHorizontal: 25, gap: 12 },
  aptChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  aptChipActive: { 
  },
  aptChipText: { fontSize: 14, fontWeight: '700' },
  aptChipTextActive: { color: '#fff', fontWeight: '900' },

  statsGrid: { 
    flexDirection: 'row', 
    marginHorizontal: 25, 
    gap: 15,
    marginBottom: 40
  },
  statBox: { 
    flex: 1, 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1, 
  },
  statIconCircle: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 12
  },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statLabel: { fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 1 },

  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    marginBottom: 20,
    gap: 15
  },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  sectionLine: { flex: 1, height: 1 },

  listContent: { paddingBottom: 120 },
  card: { 
    borderRadius: 28, 
    padding: 24, 
    marginHorizontal: 25,
    marginBottom: 16, 
    borderWidth: 1, 
    overflow: 'hidden'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardAptBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8 
  },
  cardAptText: { fontSize: 11, fontWeight: '800' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  guestName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 20 },
  
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 15,
    borderTopWidth: 1,
  },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircle: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center',
    alignItems: 'center'
  },
  dateText: { fontSize: 13, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceSymbol: { fontSize: 11, fontWeight: '700' },
  priceValue: { fontSize: 18, fontWeight: '800' },

  fab: { 
    position: 'absolute', 
    bottom: 40, 
    right: 25, 
    width: 68, 
    height: 68, 
    borderRadius: 34,
    overflow: 'hidden'
  },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  emptyCard: { 
    marginTop: 40, 
    alignItems: 'center', 
    marginHorizontal: 25,
    borderRadius: 30,
    padding: 40,
    borderWidth: 1,
  },
  emptyIconCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  emptyText: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22 },
});
