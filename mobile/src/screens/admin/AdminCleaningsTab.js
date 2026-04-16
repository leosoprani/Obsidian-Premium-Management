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
import AdminAddCleaningModal from './AdminAddCleaningModal';
import { generateReceiptPDF } from '../../services/receiptService';
import { formatDateBR } from '../../utils/dateUtils';
import MeshBackground from '../../components/MeshBackground';

export default function AdminCleaningsTab({ onBack }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [cleanings, setCleanings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      // Filtra apenas limpezas
      const filtered = (res.data || []).filter(t => t.status === 'cleaning' || t.type === 'cleaning');
      setCleanings(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReceipt = (item) => {
    Alert.alert('📄 Gerar Recibo', 'Deseja gerar o comprovante em PDF desta limpeza?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Gerar PDF', onPress: () => {
            generateReceiptPDF({
                apartment: item.apartment,
                description: 'Serviço de Limpeza Profissional',
                date: item.startDate || item.checkin,
                provider: item.notes?.replace('Prestador: ', '') || 'Não informado',
                amount: 0 // Valor pode ser extraído se houver campo de custo
            });
        }}
    ]);
  };

  const renderItem = ({ item }) => {
    return (
    <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
            <View style={[styles.iconBox, { backgroundColor: `${activeTheme.colors.secondary}15` }]}>
                <Image source={require('../../../assets/icons/cleaning_active.png')} style={{ width: 22, height: 22, tintColor: activeTheme.colors.secondary }} resizeMode="contain" />
            </View>
            <TouchableOpacity 
                style={styles.details} 
                onPress={() => { setSelectedItem(item); setShowModal(true); }}
            >
                <Text style={[styles.aptLabel, { color: activeTheme.colors.secondary }]}>APTO {item.apartment}</Text>
                <Text style={[styles.cleaningTitle, { color: activeTheme.colors.text }]}>{item.notes?.replace('Prestador: ', '') || 'Limpeza Padrão'}</Text>
                <Text style={[styles.cleaningDate, { color: activeTheme.colors.textTertiary }]}>{formatDateBR(item.checkin || item.startDate)} — {formatDateBR(item.checkout || item.endDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: `${activeTheme.colors.primary}15` }]} onPress={() => handleReceipt(item)}>
                <Image source={require('../../../assets/icons/receipt_active.png')} style={{ width: 20, height: 20, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
            </TouchableOpacity>
        </View>
    </View>
    );
  };

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
          <Text style={[styles.sub, { color: activeTheme.colors.secondary }]}>CRONOGRAMA OPERACIONAL</Text>
          <Text style={[styles.title, { color: activeTheme.colors.text }]}>Limpezas</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => { setSelectedItem(null); setShowModal(true); }}
        >
          <LinearGradient colors={[activeTheme.colors.secondary, '#1ea345']} style={styles.addGrad}>
            <Image source={require('../../../assets/icons/add_active.png')} style={{ width: 24, height: 24, tintColor: '#fff' }} resizeMode="contain" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cleanings}
        keyExtractor={(item, idx) => item._id || item.id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={activeTheme.colors.secondary} />}
         ListEmptyComponent={
          <View style={styles.empty}>
            <Image source={require('../../../assets/icons/cleaning_active.png')} style={{ width: 48, height: 48, opacity: 0.3, tintColor: activeTheme.colors.textTertiary }} resizeMode="contain" />
            <Text style={[styles.emptyText, { color: activeTheme.colors.textTertiary }]}>Nenhuma limpeza agendada.</Text>
          </View>
        }
      />

      <AdminAddCleaningModal 
        visible={showModal} 
        onClose={() => setShowModal(false)}         onRefresh={loadData}
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
  sub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  cleaningTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  cleaningSub: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 2 },
  cleaningDate: { color: theme.colors.textTertiary, fontSize: 12, fontWeight: '600' },
  
  statusBadgeText: { fontSize: 10, fontWeight: '900' },
  receiptBtn: { padding: 10, borderRadius: 12 },
  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  list: { paddingBottom: 100 }
});
