import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { ThemeContext } from '../../styles/ThemeContext';
import { cacheData, getCachedData } from '../../utils/cacheUtils';
import MeshBackground from '../../components/MeshBackground';
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
        maintenance: { label: 'Manutenção', icon: require('../../../assets/icons/hammer_active.png'), color: activeTheme.colors.primary },
        cleaning: { label: 'Limpeza', icon: require('../../../assets/icons/cleaning_active.png'), color: activeTheme.colors.secondary },
        utilities: { label: 'Contas', icon: require('../../../assets/icons/flash_active.png'), color: activeTheme.colors.warning },
        other: { label: 'Outros', icon: require('../../../assets/icons/dots_inactive.png'), color: activeTheme.colors.textTertiary },
    };
    const cat = categories[item.category] || categories.other;

    return (
        <View style={styles.cardWrapper}>
            <View style={[styles.transactionCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent', borderWidth: 0 }]}>
                <View style={[styles.iconBox, { backgroundColor: `${cat.color}20` }]}>
                    <Image source={cat.icon} style={{ width: 20, height: 20, tintColor: cat.color }} resizeMode="contain" />
                </View>
                <View style={styles.details}>
                    <Text style={[styles.transTitle, { color: activeTheme.colors.text }]}>{item.description}</Text>
                    <Text style={[styles.transSub, { color: activeTheme.colors.textSecondary }]}>{cat.label}</Text>
                    <Text style={[styles.transDate, { color: activeTheme.colors.textTertiary }]}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
                </View>
                <Text style={[styles.amount, { color: activeTheme.colors.text }]}>R$ {item.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            </View>
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
    <View style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <MeshBackground colors={activeTheme.colors.mesh} />
      {/* HEADER */}
      <View style={[styles.floatingHeader, { backgroundColor: activeTheme.colors.mesh[0] }]} pointerEvents="box-none">
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            {onBack && (
                <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder,  }]}>
                    <Image source={require('../../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24, tintColor: activeTheme.colors.primary}} resizeMode="contain" />
                </TouchableOpacity>
            )}
            <View style={{ flex: 1, marginLeft: onBack ? 15 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.title, { color: activeTheme.colors.text }]}>Financeiro</Text>
                   {isOfflineData && (
                    <View style={[styles.offlineBadge, { backgroundColor: activeTheme.colors.warning + '20' }]}>
                      <Image source={require('../../../assets/icons/offline_active.png')} style={{ width: 12, height: 12, tintColor: activeTheme.colors.warning }} resizeMode="contain" />
                    </View>
                  )}
                </View>
                <Text style={[styles.sub, { color: activeTheme.isDark ? activeTheme.colors.error : activeTheme.colors.textSecondary }]}>GESTÃO DE DESPESAS</Text>
            </View>
            <View style={{ borderRadius: 16, overflow: 'hidden' }}>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: activeTheme.colors.primary }]} onPress={() => setShowModal(true)}>
                    <Image source={require('../../../assets/icons/add_white.png')} style={{ width: 24, height: 24, tintColor: '#fff' }} resizeMode="contain" />
                </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        {/* Scroll Mask - Gradiente para desvanecer o conteúdo com a cor do topo do Mesh */}
        <LinearGradient
            colors={[activeTheme.colors.mesh[0], 'transparent']}
            style={{ position: 'absolute', bottom: -60, left: 0, right: 0, height: 60 }}
            pointerEvents="none"
        />
      </View>

      <View style={[styles.summarySection, { marginTop: 150 }]}>
      <View style={styles.summaryWrapper}>
        <View style={[styles.summary, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent', borderWidth: 0 }]}>
            <Text style={[styles.summaryLabel, { color: activeTheme.colors.textSecondary }]}>Total de Saídas</Text>
            <Text style={[styles.summaryValue, { color: activeTheme.colors.error }]}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
        </View>
      </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item, idx) => item._id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={activeTheme.colors.primary} />}
        ListEmptyComponent={
            <View style={styles.empty}>
                <Image source={require('../../../assets/icons/stats_active.png')} style={{ width: 48, height: 48, opacity: 0.3, tintColor: activeTheme.colors.textTertiary }} resizeMode="contain" />
                <Text style={[styles.emptyText, { color: activeTheme.colors.textTertiary }]}>Sem lançamentos este mês.</Text>
            </View>
        }
      />

      <AdminAddExpenseModal 
        visible={showModal} 
        onClose={() => setShowModal(false)}
        onRefresh={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingTop: 10, paddingBottom: 20 },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  summarySection: { paddingHorizontal: 25, marginBottom: 25 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  sub: { color: theme.colors.error, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.colors.error, justifyContent: 'center', alignItems: 'center' },
  offlineBadge: { 
    backgroundColor: 'rgba(255, 159, 10, 0.1)', 
    padding: 4, 
    borderRadius: 8,
  },

  summaryWrapper: {
    marginHorizontal: 25,
    marginBottom: 30,
    borderRadius: 30,
    overflow: 'hidden',
  },
  summary: { 
      padding: 24, 
      borderRadius: 30, 
      borderWidth: 1.5,
      overflow: 'hidden',
  },
  summaryLabel: { color: theme.colors.textTertiary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
  summaryValue: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },

  list: { paddingHorizontal: 25, paddingBottom: 120 },
  cardWrapper: {
      marginHorizontal: 25,
      marginBottom: 16,
      borderRadius: 30,
      overflow: 'hidden',
  },
  transactionCard: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: 18, 
      borderRadius: 30, 
      borderWidth: 1.5,
      overflow: 'hidden',
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  transTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  transSub: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 2 },
  transDate: { color: theme.colors.textTertiary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  amount: { fontSize: 18, fontWeight: '900' },

  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' }
});
