import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { ThemeContext } from '../../styles/ThemeContext';
import AddGuestModal from './AddGuestModal';
import RequestReservationModal from './RequestReservationModal';
import { formatDateBR } from '../../utils/dateUtils';

function ReservationCard({ item, onPress, activeTheme }) {
  const STATUS_CONFIG = {
    'confirmed':        { label: 'Confirmada',   color: activeTheme.colors.secondary, bg: `${activeTheme.colors.secondary}15` },
    'pending':          { label: 'Pendente',     color: activeTheme.colors.warning, bg: `${activeTheme.colors.warning}15` },
    'pending-approval': { label: 'Aguardando',   color: activeTheme.colors.warning, bg: `${activeTheme.colors.warning}15` },
    'checked-in':       { label: 'Check-in',     color: activeTheme.colors.primary, bg: `${activeTheme.colors.primary}15` },
    'checked-out':      { label: 'Check-out',    color: activeTheme.colors.accent, bg: `${activeTheme.colors.accent}15` },
    'canceled':         { label: 'Cancelada',    color: activeTheme.colors.error, bg: `${activeTheme.colors.error}15` },
    'cleaning':         { label: 'Limpeza',      color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
  };

  const status = STATUS_CONFIG[item.status] || { label: item.status, color: activeTheme.colors.textSecondary, bg: activeTheme.colors.surfaceVariant };
  
  return (
    <TouchableOpacity 
        style={[styles.resCard, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]} 
        onPress={() => onPress(item)} 
        activeOpacity={0.8}
    >
        <View style={styles.cardHeader}>
            <View>
                <Text style={[styles.cardApt, { color: activeTheme.colors.textTertiary }]}>Apto {item.apartment || '—'}</Text>
                <Text style={[styles.guestName, { color: activeTheme.colors.text }]}>{item.guestName || 'Reserva Disponível'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.color }]}>{status.label.toUpperCase()}</Text>
            </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: activeTheme.colors.border }]}>
            <View style={styles.dateInfo}>
                <Image 
                    source={require('../../../assets/icons/reservations_inactive.png')} 
                    style={{ width: 14, height: 14, opacity: 0.5 }} 
                    resizeMode="contain" 
                />
                <Text style={[styles.dateValue, { color: activeTheme.colors.textSecondary }]}>{formatDateBR(item.startDate)} — {formatDateBR(item.endDate)}</Text>
            </View>
            {item.price > 0 && (
                <Text style={[styles.priceValue, { color: activeTheme.colors.secondary }]}>
                    R$ {Number(item.price).toLocaleString('pt-BR')}
                </Text>
            )}
        </View>
    </TouchableOpacity>
  );
}

export default function ReservationsTab({ selectedApartment }) {
  const [reservations, setReservations]   = useState([]);
  const [filtered, setFiltered]           = useState([]);
  const [searchText, setSearchText]       = useState('');
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showGuestModal, setShowGuestModal]     = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const { theme: activeTheme } = React.useContext(ThemeContext);

  const loadReservations = useCallback(async () => {
    try {
      const res = await api.get('/reservations');
      let data = res.data;
      
      if (selectedApartment) {
        data = data.filter(r => String(r.apartment) === String(selectedApartment));
      }
      
      const sorted = data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setReservations(sorted);
      setFiltered(sorted);
    } catch (e) {
      console.error('Erro ao carregar reservas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedApartment]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  const onSearch = (text) => {
    setSearchText(text);
    if (!text) {
      setFiltered(reservations);
    } else {
      const lower = text.toLowerCase();
      setFiltered(reservations.filter(r =>
        (r.guestName && r.guestName.toLowerCase().includes(lower)) ||
        (r.apartment && r.apartment.toLowerCase().includes(lower))
      ));
    }
  };

  if (loading) {
      return (
          <View style={[styles.centered, { backgroundColor: activeTheme.colors.background }]}>
              <ActivityIndicator size="small" color={activeTheme.colors.primary} />
          </View>
      );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <View style={styles.header}>
          <View>
              <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>Reservas</Text>
              <Text style={[styles.headerSub, { color: activeTheme.colors.primary }]}>HISTÓRICO DO IMÓVEL</Text>
          </View>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => setShowGuestModal(true)} 
            style={[styles.headerBtn, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]}
          >
              <Image 
                source={require('../../../assets/icons/profile_active.png')} 
                style={{ width: 22, height: 22 }} 
                resizeMode="contain" 
              />
          </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id || item._id}
        renderItem={({ item }) => (
          <ReservationCard 
            item={item} 
            activeTheme={activeTheme}
            onPress={(r) => { setEditingReservation(r); setShowRequestModal(true); }} 
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={loadReservations} 
                tintColor={activeTheme.colors.primary} 
            />
        }
        ListHeaderComponent={
          <>
            <View style={styles.searchSection}>
                <View style={[styles.searchBar, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]}>
                    <Image 
                        source={require('../../../assets/icons/search_inactive.png')} 
                        style={[styles.searchIcon, { width: 18, height: 18, opacity: 0.5 }]} 
                        resizeMode="contain" 
                    />
                    <TextInput 
                        style={[styles.searchInput, { color: activeTheme.colors.text }]}
                        placeholder="Buscar por hóspede ou apartamento..."
                        placeholderTextColor={activeTheme.colors.textTertiary}
                        value={searchText}
                        onChangeText={onSearch}
                    />
                </View>
            </View>

            <View style={[styles.kpiGrid, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]}>
                <View style={styles.kpiItem}>
                    <Text style={[styles.kpiValue, { color: activeTheme.colors.text }]}>{reservations.length}</Text>
                    <Text style={[styles.kpiLabel, { color: activeTheme.colors.textTertiary }]}>Total</Text>
                </View>
                <View style={[styles.kpiItem, { borderLeftWidth: 1, borderLeftColor: activeTheme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: activeTheme.colors.secondary }]}>
                        {reservations.filter(r => r.status === 'confirmed').length}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: activeTheme.colors.textTertiary }]}>Confirmadas</Text>
                </View>
                <View style={[styles.kpiItem, { borderLeftWidth: 1, borderLeftColor: activeTheme.colors.border }]}>
                    <Text style={[styles.kpiValue, { color: activeTheme.colors.warning }]}>
                        {reservations.filter(r => r.status === 'pending-approval').length}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: activeTheme.colors.textTertiary }]}>Aguardando</Text>
                </View>
            </View>

            <Text style={[styles.sectionTitle, { color: activeTheme.colors.textTertiary }]}>Atividade Recente</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image 
                source={require('../../../assets/icons/reservations_inactive.png')} 
                style={{ width: 48, height: 48, opacity: 0.3 }} 
                resizeMode="contain" 
            />
            <Text style={[styles.emptyText, { color: activeTheme.colors.textTertiary }]}>Nenhuma reserva registrada.</Text>
          </View>
        }
      />

      <TouchableOpacity 
          activeOpacity={0.9}
          style={styles.fab} 
          onPress={() => { setEditingReservation(null); setShowRequestModal(true); }}
      >
        <LinearGradient 
            colors={[activeTheme.colors.primary, '#0055ff']} 
            style={styles.fabGradient}
        >
            <Image 
                source={require('../../../assets/icons/add_white.png')} 
                style={{ width: 30, height: 30 }} 
                resizeMode="contain" 
            />
        </LinearGradient>
      </TouchableOpacity>

      <RequestReservationModal
        visible={showRequestModal}
        initialData={editingReservation}
        userRole="owner"
        onClose={() => { setShowRequestModal(false); setEditingReservation(null); }}
        onSuccess={() => { setShowRequestModal(false); setEditingReservation(null); loadReservations(); }}
      />
      <AddGuestModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onSuccess={() => { setShowGuestModal(false); Alert.alert('✅ Sucesso', 'Hóspede cadastrado!'); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 10,
    paddingBottom: 25 
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  headerBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
  },
  
  listContent: { paddingBottom: 120 },
  
  searchSection: { paddingHorizontal: 25, marginBottom: 20 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 16, 
    paddingHorizontal: 15, 
    borderWidth: 1, 
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 14, fontWeight: '500' },

  kpiGrid: { 
    flexDirection: 'row', 
    marginHorizontal: 25,
    borderRadius: 24,
    paddingVertical: 20,
    marginBottom: 30,
    borderWidth: 1,
  },
  kpiItem: { flex: 1, alignItems: 'center' },
  kpiValue: { fontSize: 24, fontWeight: '800' },
  kpiLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },

  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '800', 
    textTransform: 'uppercase', 
    marginHorizontal: 25,
    marginBottom: 15, 
    letterSpacing: 1.5 
  },

  resCard: { 
    borderRadius: 24, 
    padding: 20, 
    marginHorizontal: 25,
    marginBottom: 15, 
    borderWidth: 1, 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  cardApt: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  guestName: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
  },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateValue: { fontSize: 13, fontWeight: '500' },
  priceValue: { fontSize: 15, fontWeight: '800' },
  
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 25, 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    overflow: 'hidden',
    elevation: 8
  },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  empty: { marginTop: 60, alignItems: 'center', gap: 15 },
  emptyText: { fontSize: 16, fontWeight: '500' }
});
