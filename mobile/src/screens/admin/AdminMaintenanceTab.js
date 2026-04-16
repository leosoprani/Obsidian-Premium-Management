import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity,
  SafeAreaView, Image
} from 'react-native';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { ThemeContext } from '../../styles/ThemeContext';
import MeshBackground from '../../components/MeshBackground';

export default function AdminMaintenanceTab({ onBack }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const renderItem = ({ item }) => {
    const types = {
        cleaning: { label: 'Limpeza', icon: require('../../../assets/icons/cleaning_active.png'), color: theme.colors.secondary },
        maintenance: { label: 'Manutenção', icon: require('../../../assets/icons/maintenance_active.png'), color: theme.colors.primary },
        blocked: { label: 'Bloqueio', icon: require('../../../assets/icons/stop_active.png'), color: theme.colors.error },
    };
    const config = types[item.type] || types.maintenance;

    return (
        <View style={styles.cardWrapper}>
            <View 
                style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }]}
            >
                <View style={[styles.iconBox, { backgroundColor: `${activeTheme.colors.primary}15` }]}>
                    <Image source={require('../../../assets/icons/maintenance_active.png')} style={{ width: 22, height: 22, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                </View>
                <View style={styles.details}>
                    <Text style={[styles.cardTitle, { color: activeTheme.colors.text }]}>Apto {item.apartment || 'Geral'}</Text>
                    <Text style={[styles.cardSub, { color: activeTheme.colors.textSecondary }]}>{item.description || 'Manutenção Preventiva'}</Text>
                    <Text style={[styles.cardDate, { color: activeTheme.colors.textTertiary }]}>{formatDateBR(item.date || item.startDate)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.completed ? `${activeTheme.colors.secondary}15` : `${activeTheme.colors.warning}15` }]}>
                    <Text style={[styles.statusText, { color: item.completed ? activeTheme.colors.secondary : activeTheme.colors.warning }]}>
                        {item.completed ? 'Ok' : 'Pendente'}
                    </Text>
                </View>
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
      <View style={styles.header}>
        {onBack && (
            <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
                <Image source={require('../../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24, tintColor: activeTheme.colors.primary}} resizeMode="contain" />
            </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: activeTheme.colors.text }]}>Manutenção</Text>
            <Text style={[styles.sub, { color: activeTheme.colors.primary }]}>TAREFAS E BLOQUEIOS</Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item, idx) => item._id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
            <View style={styles.empty}>
                <Image source={require('../../../assets/icons/maintenance_active.png')} style={{ width: 48, height: 48, opacity: 0.3, tintColor: activeTheme.colors.textTertiary }} resizeMode="contain" />
                <Text style={[styles.emptyText, { color: activeTheme.colors.textTertiary }]}>Nenhuma tarefa registrada.</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 25, 
      paddingTop: 60, 
      paddingBottom: 20 
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  sub: { color: theme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15,  },

  list: { paddingBottom: 120 },
  cardWrapper: {
      marginHorizontal: 25,
      marginBottom: 16,
      borderRadius: 30,
      overflow: 'hidden',
  },
  card: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: 18, 
      borderRadius: 30, 
      borderWidth: 0,
      overflow: 'hidden',
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  cardSub: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  cardDate: { fontSize: 12, fontWeight: '600' },
  
  statusBadgeText: { fontSize: 10, fontWeight: '900' },

  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' }
});
