import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';
import { theme } from '../../styles/theme';
import AdminAddMaintenanceModal from './AdminAddMaintenanceModal';
import { generateReceiptPDF } from '../../services/receiptService';
import { formatDateBR } from '../../utils/dateUtils';

export default function AdminMaintenancesTab() {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      const filtered = (res.data || []).filter(t => t.status === 'maintenance' || t.type === 'maintenance');
      setMaintenances(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReceipt = (item) => {
    Alert.alert('📄 Gerar Recibo', 'Deseja gerar o comprovante em PDF desta manutenção?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Gerar PDF', onPress: () => {
            generateReceiptPDF({
                apartment: item.apartment,
                description: item.description || 'Serviço de Manutenção',
                date: item.startDate || item.checkin,
                provider: item.notes?.replace('Empresa: ', '') || 'Não informado',
                amount: 0
            });
        }}
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: `${activeTheme.colors.primary}15` }]}>
        <Image source={require('../../assets/icons/hammer_active.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
      </View>
      <TouchableOpacity 
        style={styles.details} 
        onPress={() => { setSelectedItem(item); setShowModal(true); }}
      >
        <Text style={[styles.aptLabel, { color: activeTheme.colors.primary }]}>APTO {item.apartment}</Text>
        <Text style={[styles.desc, { color: activeTheme.colors.text }]}>{item.description || 'Manutenção'}</Text>
        <Text style={[styles.date, { color: activeTheme.colors.textTertiary }]}>{formatDateBR(item.checkin || item.startDate)} — {formatDateBR(item.checkout || item.endDate)}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: `${activeTheme.colors.primary}15` }]} onPress={() => handleReceipt(item)}>
        <Image source={require('../../assets/icons/receipt_inactive.png')} style={{ width: 20, height: 20, opacity: 0.7 }} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: activeTheme.colors.text }]}>Manutenção</Text>
          <Text style={[styles.sub, { color: activeTheme.colors.primary }]}>REPAROS E CONSERTOS</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => { setSelectedItem(null); setShowModal(true); }}
        >
          <LinearGradient colors={[activeTheme.colors.primary, '#0055ff']} style={styles.addGrad}>
            <Image source={require('../../assets/icons/add_white.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={maintenances}
        keyExtractor={(item, idx) => item._id || item.id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={activeTheme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image source={require('../../assets/icons/hammer_inactive.png')} style={{ width: 48, height: 48, opacity: 0.5 }} resizeMode="contain" />
            <Text style={styles.emptyText}>Nenhuma manutenção registrada.</Text>
          </View>
        }
      />

      <AdminAddMaintenanceModal 
        visible={showModal} 
        onClose={() => setShowModal(false)} 
        onRefresh={loadData}
        initialData={selectedItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingTop: 20, paddingBottom: 25 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 25, paddingBottom: 100 },
  card: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 18, borderRadius: 24, marginBottom: 16, borderWidth: 1
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  aptLabel: { fontSize: 11, fontWeight: '900', marginBottom: 2 },
  desc: { fontSize: 15, fontWeight: '700' },
  date: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  receiptBtn: { padding: 10, borderRadius: 12 },
  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { fontSize: 16, fontWeight: '600' }
});
