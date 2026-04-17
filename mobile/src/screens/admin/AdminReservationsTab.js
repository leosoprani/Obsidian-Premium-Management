import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';
import { THEMES, theme } from '../../styles/theme';
import { cacheData, getCachedData } from '../../utils/cacheUtils';
import { formatDateBR } from '../../utils/dateUtils';

import RequestReservationModal from '../owner/RequestReservationModal';
import MeshBackground from '../../components/MeshBackground';
import { useTabBarScroll } from '../../hooks/useTabBarScroll';

const { width, height } = Dimensions.get('window');

const getStatusConfig = (theme) => ({
  'pending-approval': { label: 'Pendente',   color: theme.colors.warning, bg: `${theme.colors.warning}20` },
  'confirmed':        { label: 'Confirmada', color: theme.colors.secondary, bg: `${theme.colors.secondary}20` },
  'checked-in':       { label: 'Check-in',   color: theme.colors.primary, bg: `${theme.colors.primary}20` },
  'checked-out':      { label: 'Check-out',  color: theme.colors.accent, bg: `${theme.colors.accent}20` },
  'finished':         { label: 'Finalizada', color: theme.colors.textTertiary, bg: theme.colors.glassSecondary },
  'canceled':         { label: 'Cancelada',  color: theme.colors.error, bg: `${theme.colors.error}20` },
});

function ReservationItem({ item, onAction }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const statusConfig = getStatusConfig(activeTheme);
  const status = statusConfig[item.status] || { label: item.status, color: activeTheme.colors.textSecondary, bg: activeTheme.colors.glass };
  
  return (
    <View style={styles.resCardWrapper}>
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => onAction(item, 'edit')}
        style={{ flex: 1 }}
      >
        <View style={[styles.resCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent', borderWidth: 0 }]}>
            <View style={styles.resHeader}>
                <View style={{ flex: 1 }}>
                    <View style={[styles.aptBadge, { backgroundColor: activeTheme.colors.glassSecondary }]}>
                        <Text style={[styles.aptBadgeText, { color: activeTheme.colors.primary }]}># {item.apartment || '—'}</Text>
                    </View>
                    <Text style={[styles.resGuest, { color: activeTheme.colors.text }]} numberOfLines={1}>{item.guestName || 'Novo Hóspede'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.badgeText, { color: status.color }]}>{status.label.toUpperCase()}</Text>
                </View>
            </View>
            
            <View style={styles.resDatesRow}>
                <View style={styles.resDateBlock}>
                    <View style={[styles.dateIconCircle, { backgroundColor: `${activeTheme.colors.primary}10` }]}>
                        <Image source={require('../../../assets/icons/reservations_active.png')} style={{ width: 12, height: 12, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                    </View>
                    <Text style={[styles.resDateValue, { color: activeTheme.colors.textSecondary }]}>{formatDateBR(item.startDate)} — {formatDateBR(item.endDate)}</Text>
                </View>
                 <View style={styles.detailsIndicator}>
                    <Image source={require('../../../assets/icons/chevron_forward_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.textTertiary }} resizeMode="contain" />
                </View>
            </View>
            
            {item.status === 'pending-approval' && (
                <View style={[styles.actionRow, { borderTopColor: 'rgba(255,255,255,0.05)' }]}>
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={styles.approveBtnContainer} 
                        onPress={(e) => { e.stopPropagation(); onAction(item, 'approve'); }}
                    >
                        <LinearGradient 
                            colors={[activeTheme.colors.primary, activeTheme.colors.glass]} 
                            start={{x: 0, y: 0}} 
                            end={{x: 1, y: 0}}
                            style={[styles.approveGradient, { borderColor: activeTheme.colors.glassBorder, borderWidth: 1 }]}
                        >
                            <Text style={styles.approveText}>Aprovar Reserva</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        style={[styles.rejectBtn, { backgroundColor: `${activeTheme.colors.error}10`, borderColor: `${activeTheme.colors.error}20` }]} 
                        onPress={(e) => { e.stopPropagation(); onAction(item, 'reject'); }}
                    >
                        <Image source={require('../../../assets/icons/cancel_white.png')} style={{ width: 18, height: 18, tintColor: activeTheme.colors.error, opacity: 0.8 }} resizeMode="contain" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ... styles part below

export default function AdminReservationsTab() {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const { handleScroll } = useTabBarScroll();
  const [reservations, setReservations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ativas'); // ativas, pendentes, finalizadas, historico
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);

  const [isOfflineData, setIsOfflineData] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Tenta carregar do cache primeiro para resposta instantânea
      const cached = await getCachedData('admin_reservations');
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setReservations(cached);
        setIsOfflineData(true);
      }

      // 2. Busca dados atualizados da API
      const res = await api.get('/reservations');
      const sorted = res.data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      
      setReservations(sorted);
      setIsOfflineData(false);
      
      // 3. Salva no cache para o próximo acesso
      await cacheData('admin_reservations', sorted);

    } catch (error) {
      console.error('Reservation Load Error:', error);
      // Se falhou a API mas temos cache, o isOfflineData continuará true
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Captura filtros vindos de outros painéis (ex: Dashboard)
  useEffect(() => {
    if (window.pendingAdminFilter) {
        setActiveFilter(window.pendingAdminFilter);
        // Limpa para não persistir em navegações manuais futuras
        delete window.pendingAdminFilter;
    }
  }, []);

  const filteredReservations = useMemo(() => {
    let list = [...reservations];

    // Filter by Category
    if (activeFilter === 'pendentes') {
      list = list.filter(r => r.status === 'pending-approval');
    } else if (activeFilter === 'ativas') {
      list = list.filter(r => ['confirmed', 'checked-in'].includes(r.status));
    } else if (activeFilter === 'finalizadas') {
      list = list.filter(r => ['finished', 'checked-out'].includes(r.status));
    } else if (activeFilter === 'historico') {
      list = list.filter(r => ['canceled', 'finished'].includes(r.status));
    }

    // Filter by Search
    if (searchText) {
      const low = searchText.toLowerCase();
      list = list.filter(r => 
        (r.guestName && r.guestName.toLowerCase().includes(low)) ||
        (r.apartment && r.apartment.toLowerCase().includes(low))
      );
    }

    return list;
  }, [reservations, activeFilter, searchText]);

  const handleAction = async (reservation, type) => {
      if (type === 'edit') {
          setSelectedRes(reservation);
          setShowModal(true);
      } else if (type === 'create') {
          setSelectedRes(null);
          setShowModal(true);
      } else if (type === 'approve') {
          Alert.alert('✅ Aprovar Reserva', `Deseja aprovar a reserva do Apto ${reservation.apartment}?`, [
              { text: 'Voltar', style: 'cancel' },
              { text: 'Aprovar', onPress: async () => {
                  try {
                      await api.post('/reservations', { ...reservation, status: 'confirmed' });
                      loadData();
                  } catch(e) { Alert.alert('Erro', 'Falha ao aprovar'); }
              }}
          ]);
      } else if (type === 'reject') {
          Alert.alert('⚠️ Recusar Solicitação', `Deseja recusar a solicitação do Apto ${reservation.apartment}?`, [
              { text: 'Voltar', style: 'cancel' },
              { text: 'Recusar', style: 'destructive', onPress: async () => {
                  try {
                      await api.post('/reservations', { ...reservation, status: 'canceled' });
                      loadData();
                  } catch(e) { Alert.alert('Erro', 'Falha ao recusar'); }
              }}
          ]);
      }
  };

  const FilterButton = ({ id, label, icon }) => {
    const isActive = activeFilter === id;
     return (
      <TouchableOpacity 
        style={[styles.filterBtn, { backgroundColor: isActive ? activeTheme.colors.primary : activeTheme.colors.glass, borderColor: isActive ? activeTheme.colors.primary : activeTheme.colors.glassBorder }, isActive && styles.filterBtnActive]} 
        onPress={() => setActiveFilter(id)}
      >
        <Text style={[styles.filterLabel, { color: isActive ? '#fff' : activeTheme.colors.textSecondary }, isActive && styles.filterLabelActive]}>{label}</Text>
      </TouchableOpacity>
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
    <View style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <MeshBackground colors={activeTheme.colors.mesh} />
      {/* HEADER */}
      <View style={[styles.floatingHeader, { backgroundColor: activeTheme.colors.mesh[0], borderBottomWidth: 0 }]} pointerEvents="box-none">
        <SafeAreaView edges={['top']} style={{ flex: 0 }}>
            <View style={styles.headerContent}>
                <View>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.headerSub, { color: activeTheme.colors.primary }]}>GESTÃO DE ESTADIAS</Text>
                      {isOfflineData && (
                        <View style={[styles.offlineBadge, { backgroundColor: `${activeTheme.colors.warning}15` }]}>
                          <Image source={require('../../../assets/icons/offline_active.png')} style={{ width: 10, height: 10, tintColor: activeTheme.colors.warning }} resizeMode="contain" />
                          <Text style={[styles.offlineText, { color: activeTheme.colors.warning }]}>OFFLINE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>Reservas</Text>
                </View>
                <TouchableOpacity 
                    activeOpacity={0.8}
                    style={styles.addBtnContainer} 
                    onPress={() => handleAction(null, 'create')}
                >
                     <LinearGradient 
                        colors={[activeTheme.colors.primary, '#0055ff']} 
                        style={styles.addBtnGrad}
                    >
                        <Image source={require('../../../assets/icons/add_active.png')} style={{ width: 24, height: 24, tintColor: '#fff' }} resizeMode="contain" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.filterScroll}
            >
              <FilterButton id="ativas" label="Ativas" icon="play-circle-outline" />
              <FilterButton id="pendentes" label="Pendentes" icon="time-outline" />
              <FilterButton id="finalizadas" label="Finalizadas" icon="checkmark-circle-outline" />
              <FilterButton id="historico" label="Histórico" icon="archive-outline" />
            </ScrollView>
        </SafeAreaView>
        {/* Scroll Mask - Gradiente para desvanecer o conteúdo com a cor do topo do Mesh */}
        <LinearGradient
            colors={[activeTheme.colors.mesh[0], 'transparent']}
            style={{ position: 'absolute', bottom: -60, left: 0, right: 0, height: 60 }}
            pointerEvents="none"
        />
      </View>

      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id || item._id}
        renderItem={({ item }) => <ReservationItem item={item} onAction={handleAction} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={loadData} 
                tintColor={activeTheme.colors.primary} 
            />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
           <View style={[styles.topSection, { paddingTop: height * 0.25 }]}>
            <View style={[styles.searchBar, { borderColor: activeTheme.colors.glassBorder, backgroundColor: activeTheme.colors.glass }]}>
              <Image source={require('../../../assets/icons/search_active.png')} style={{ width: 18, height: 18, marginRight: 12, opacity: 0.6, tintColor: activeTheme.colors.text }} resizeMode="contain" />
              <TextInput 
                style={[styles.searchInput, { color: activeTheme.colors.text }]}
                placeholder="Buscar por apto ou hóspede..."
                placeholderTextColor={activeTheme.colors.textTertiary}
                value={searchText}
                onChangeText={setSearchText}
                selectionColor={activeTheme.colors.primary}
                autoCorrect={false}
              />
               {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                      <Image source={require('../../../assets/icons/close_white.png')} style={{ width: 16, height: 16, opacity: 0.7, tintColor: activeTheme.colors.text }} resizeMode="contain" />
                  </TouchableOpacity>
              ) : null}
            </View>
          </View>
        }
         ListEmptyComponent={
            <View style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: activeTheme.colors.glass }]}>
                    <Image source={require('../../../assets/icons/reservations_active.png')} style={{ width: 48, height: 48, opacity: 0.3, tintColor: activeTheme.colors.text }} resizeMode="contain" />
                </View>
                <Text style={[styles.emptyText, { color: activeTheme.colors.text }]}>Nada por aqui</Text>
                <Text style={[styles.emptySub, { color: activeTheme.colors.textTertiary }]}>Nenhuma reserva encontrada nesta categoria.</Text>
            </View>
        }
      />

      <RequestReservationModal 
          visible={showModal}
          initialData={selectedRes}
          userRole="admin"
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadData(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 5,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  headerSub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  offlineBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(255, 159, 10, 0.1)', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4,
    marginBottom: 2
  },
  offlineText: { color: theme.colors.warning, fontSize: 9, fontWeight: '900' },
  addBtnContainer: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterScroll: { paddingHorizontal: 25, paddingBottom: 15, gap: 10 },
  filterBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 25, 
    borderWidth: 1, 
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterBtnActive: { 
  },
  filterLabel: { fontSize: 13, fontWeight: '700' },
  filterLabelActive: { color: '#fff', fontWeight: '900' },

  topSection: { paddingHorizontal: 25, marginBottom: 20 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 28, 
    paddingHorizontal: 20, 
    borderWidth: 1, 
    overflow: 'hidden'
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 52, fontSize: 15, fontWeight: '700' },
  
  listContent: { paddingBottom: 150 },
  resCardWrapper: { 
    marginHorizontal: 25,
    marginBottom: 16, 
    borderRadius: 30,
    overflow: 'hidden',
  },
  resCard: { 
    borderRadius: 30, 
    padding: 20, 
    borderWidth: 1.5, 
    overflow: 'hidden'
  },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  aptBadge: { 
    backgroundColor: 'rgba(10, 132, 255, 0.15)', 
    paddingHorizontal: 8, paddingVertical: 4, 
    borderRadius: 6, alignSelf: 'flex-start',
    marginBottom: 4
  },
  aptBadgeText: { color: theme.colors.primary, fontSize: 10, fontWeight: '900' },
  resGuest: { color: theme.colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  resDatesRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  resDateBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateIconCircle: { 
      width: 24, height: 24, borderRadius: 8, 
      backgroundColor: 'rgba(10, 132, 255, 0.1)',
      justifyContent: 'center', alignItems: 'center'
  },
  resDateValue: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  detailsIndicator: { padding: 5 },
  
  actionRow: { 
    flexDirection: 'row', 
    gap: 12,
    paddingTop: 15,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)'
  },
  approveBtnContainer: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  approveGradient: { height: 44, justifyContent: 'center', alignItems: 'center' },
  approveText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  rejectBtn: { 
    width: 44, height: 44,
    backgroundColor: 'rgba(255, 69, 58, 0.1)', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 69, 58, 0.2)'
  },

  empty: { 
      marginTop: 40, alignItems: 'center', 
      marginHorizontal: 40, padding: 30
  },
  emptyIconWrap: { 
      width: 64, height: 64, borderRadius: 32, 
      backgroundColor: 'rgba(255,255,255,0.02)',
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 15
  },
  emptyText: { color: theme.colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySub: { color: theme.colors.textTertiary, fontSize: 13, textAlign: 'center', marginTop: 5, lineHeight: 18 }
});
