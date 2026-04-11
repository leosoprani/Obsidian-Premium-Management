import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import AdminAddBlockingModal from './AdminAddBlockingModal';
import { formatDateBR } from '../../utils/dateUtils';

export default function AdminBlockingsTab() {
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
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${theme.colors.error}15` }]}>
        <Image source={require('../../assets/icons/stop_active.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
      </View>
      <TouchableOpacity 
        style={styles.details} 
        onPress={() => { setSelectedItem(item); setShowModal(true); }}
      >
        <Text style={styles.aptLabel}>APTO {item.apartment}</Text>
        <Text style={styles.desc}>{item.notes || 'Bloqueio Administrativo'}</Text>
        <Text style={styles.date}>{formatDateBR(item.checkin || item.startDate)} — {formatDateBR(item.checkout || item.endDate)}</Text>
      </TouchableOpacity>
      
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>BLOQUEADO</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bloqueios</Text>
          <Text style={styles.sub}>INDISPONIBILIDADE DE APTOS</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => { setSelectedItem(null); setShowModal(true); }}
        >
          <LinearGradient colors={[theme.colors.error, '#ff4b2b']} style={styles.addGrad}>
            <Image source={require('../../assets/icons/add_white.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
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
            <Image source={require('../../assets/icons/stop_inactive.png')} style={{ width: 48, height: 48, opacity: 0.5 }} resizeMode="contain" />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingTop: 20, paddingBottom: 25 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: theme.colors.error, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 25, paddingBottom: 100 },
  card: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceVariant, 
    padding: 18, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border 
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  aptLabel: { color: theme.colors.error, fontSize: 11, fontWeight: '900', marginBottom: 2 },
  desc: { color: '#fff', fontSize: 15, fontWeight: '700' },
  date: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 4, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255, 69, 58, 0.1)', borderRadius: 8 },
  statusText: { color: theme.colors.error, fontSize: 9, fontWeight: '900' },
  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' }
});
