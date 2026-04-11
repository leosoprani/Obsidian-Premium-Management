import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';
import { theme } from '../../styles/theme';
import { cacheData, getCachedData } from '../../utils/cacheUtils';
import AdminAddExpenseModal from './AdminAddExpenseModal';

export default function AdminFinanceTab({ onBack }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [isOfflineData, setIsOfflineData] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Tenta carregar do cache primeiro
      const cached = await getCachedData('admin_expenses');
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setExpenses(cached);
        setIsOfflineData(true);
      }

      // 2. Busca da API
      const res = await api.get('/expenses');
      const data = res.data || [];
      setExpenses(data);
      setIsOfflineData(false);
      
      // 3. Salva no cache
      await cacheData('admin_expenses', data);

    } catch (e) {
      console.error('Finance Load Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const total = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const renderItem = ({ item }) => {
    const categories = {
        maintenance: { label: 'Manutenção', icon: require('../../assets/icons/hammer_active.png'), color: activeTheme.colors.primary },
        cleaning: { label: 'Limpeza', icon: require('../../assets/icons/cleaning_active.png'), color: activeTheme.colors.secondary },
        utilities: { label: 'Contas', icon: require('../../assets/icons/flash_active.png'), color: activeTheme.colors.warning },
        other: { label: 'Outros', icon: require('../../assets/icons/dots_inactive.png'), color: activeTheme.colors.textTertiary },
    };
    const cat = categories[item.category] || categories.other;

    return (
        <View style={[styles.card, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: `${cat.color}15` }]}>
                <Image source={cat.icon} style={{ width: 20, height: 20 }} resizeMode="contain" />
            </View>
            <View style={styles.details}>
                <Text style={[styles.desc, { color: activeTheme.colors.text }]}>{item.description}</Text>
                <Text style={[styles.date, { color: activeTheme.colors.textTertiary }]}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
            </View>
            <Text style={[styles.amount, { color: activeTheme.colors.text }]}>R$ {item.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
        </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <View style={styles.header}>
        {onBack && (
            <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: activeTheme.colors.surfaceVariant }]}>
                <Image source={require('../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.title, { color: activeTheme.colors.text }]}>Financeiro</Text>
              {isOfflineData && (
                <View style={[styles.offlineBadge, { backgroundColor: `${activeTheme.colors.warning}15` }]}>
                  <Image source={require('../../assets/icons/offline_active.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                </View>
              )}
            </View>
            <Text style={[styles.sub, { color: activeTheme.isDark ? activeTheme.colors.error : activeTheme.colors.textSecondary }]}>GESTÃO DE DESPESAS</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: activeTheme.colors.error }]} onPress={() => setShowModal(true)}>
            <Image source={require('../../assets/icons/add_white.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <View style={[styles.summary, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]}>
          <Text style={[styles.summaryLabel, { color: activeTheme.colors.textTertiary }]}>Total de Saídas</Text>
          <Text style={[styles.summaryValue, { color: activeTheme.colors.error }]}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item, idx) => item._id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={activeTheme.colors.primary} />}
        ListEmptyComponent={
            <View style={styles.empty}>
                <Image source={require('../../assets/icons/receipt_inactive.png')} style={{ width: 48, height: 48, opacity: 0.5 }} resizeMode="contain" />
                <Text style={styles.emptyText}>Nenhuma despesa registrada.</Text>
            </View>
        }
      />

      <AdminAddExpenseModal 
        visible={showModal} 
        onClose={() => setShowModal(false)}
        onRefresh={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 25, 
      paddingTop: 20, 
      paddingBottom: 25,
      gap: 15
  },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: theme.colors.error, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.colors.error, justifyContent: 'center', alignItems: 'center' },
  offlineBadge: { 
    backgroundColor: 'rgba(255, 159, 10, 0.1)', 
    padding: 4, 
    borderRadius: 8,
  },

  summary: { 
      marginHorizontal: 25, 
      padding: 24, 
      borderRadius: 24, 
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 30
  },
  summaryLabel: { color: theme.colors.textTertiary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
  summaryValue: { color: theme.colors.error, fontSize: 36, fontWeight: '900', letterSpacing: -1 },

  list: { paddingHorizontal: 25, paddingBottom: 120 },
  card: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: theme.colors.surfaceVariant, 
      padding: 18, 
      borderRadius: 20, 
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  desc: { color: '#fff', fontSize: 15, fontWeight: '700' },
  date: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 2, fontWeight: '600' },
  amount: { color: '#fff', fontSize: 15, fontWeight: '800' },

  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' }
});
