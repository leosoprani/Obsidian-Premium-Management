import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';
import { theme } from '../../styles/theme';
import AdminAddBlockingModal from './AdminAddBlockingModal';
import { formatDateBR } from '../../utils/dateUtils';
import MeshBackground from '../../components/MeshBackground';

export default function AdminBlockingsTab({ onBack }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [blockings, setBlockings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      const filtered = (res.data || []).filter(t => t.status === 'blocked' || t.type === 'blocked');
      setBlockings(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const renderItem = ({ item }) => (
        <View style={styles.cardWrapper}>
            <View style={[styles.card, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder, borderWidth: 1 }]}>
                <View style={[styles.iconBox, { backgroundColor: `${activeTheme.colors.error}15` }]}>
                    <Image source={require('../../../assets/icons/stop_active.png')} style={{ width: 22, height: 22, tintColor: activeTheme.colors.error }} resizeMode="contain" />
                </View>
                <TouchableOpacity 
                    style={styles.details} 
                    onPress={() => { setSelectedItem(item); setShowModal(true); }}
                >
                    <Text style={[styles.cardTitle, { color: activeTheme.colors.text }]}>Apto {item.apartment}</Text>
                    <Text style={[styles.cardSub, { color: activeTheme.colors.textSecondary }]}>{item.notes || 'Bloqueio de Agenda'}</Text>
                    <Text style={[styles.cardDate, { color: activeTheme.colors.textTertiary }]}>{formatDateBR(item.checkin || item.startDate)} — {formatDateBR(item.checkout || item.endDate)}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <MeshBackground colors={activeTheme.colors.mesh} />
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.header}>
        {onBack && (
            <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder,  }]}>
                <Image source={require('../../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24, tintColor: activeTheme.colors.primary}} resizeMode="contain" />
            </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: activeTheme.colors.text }]}>Bloqueios</Text>
          <Text style={[styles.sub, { color: activeTheme.colors.error }]}>INDISPONIBILIDADE DE APTOS</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => { setSelectedItem(null); setShowModal(true); }}
        >
          <LinearGradient colors={[activeTheme.colors.error, '#ff4b2b']} style={styles.addGrad}>
            <Image source={require('../../../assets/icons/add_white.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={blockings}
        keyExtractor={(item, idx) => item._id || item.id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.error} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image source={require('../../../assets/icons/stop_white.png')} style={{ width: 48, height: 48, opacity: 0.3 }} resizeMode="contain" />
            <Text style={styles.emptyText}>Nenhum apartamento bloqueado.</Text>
          </View>
        }
      />

      <AdminAddBlockingModal 
        visible={showModal} 
        onClose={() => setShowModal(false)} 
        onRefresh={loadData}
        initialData={selectedItem}
      />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 25 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  sub: { color: theme.colors.error, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 25, paddingBottom: 100 },
  cardWrapper: {
    marginHorizontal: 25,
    marginBottom: 16,
    borderRadius: 30,
    overflow: 'hidden',
  },
  card: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 18, borderRadius: 30, borderWidth: 1.5,
    overflow: 'hidden',
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  aptLabel: { color: theme.colors.error, fontSize: 11, fontWeight: '900', marginBottom: 2 },
  desc: { color: '#fff', fontSize: 15, fontWeight: '700' },
  date: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 4, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255, 69, 58, 0.1)', borderRadius: 8 },
  statusText: { color: theme.colors.error, fontSize: 9, fontWeight: '900' },
  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' },
  list: { paddingHorizontal: 25, paddingBottom: 100 },
});
