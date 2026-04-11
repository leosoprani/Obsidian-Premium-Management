import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity,
  SafeAreaView, Image
} from 'react-native';
import api from '../../services/api';
import { theme } from '../../styles/theme';

export default function AdminMaintenanceTab({ onBack }) {
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
        cleaning: { label: 'Limpeza', icon: require('../../assets/icons/cleaning_active.png'), color: theme.colors.secondary },
        maintenance: { label: 'Manutenção', icon: require('../../assets/icons/maintenance_active.png'), color: theme.colors.primary },
        blocked: { label: 'Bloqueio', icon: require('../../assets/icons/stop_active.png'), color: theme.colors.error },
    };
    const config = types[item.type] || types.maintenance;

    return (
        <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: `${config.color}15` }]}>
                <Image source={config.icon} style={{ width: 20, height: 20 }} resizeMode="contain" />
            </View>
            <View style={styles.details}>
                <Text style={styles.aptLabel}>Apartamento {item.apartment}</Text>
                <Text style={styles.desc}>{item.description || config.label}</Text>
                <Text style={styles.date}>{new Date(item.startDate).toLocaleDateString('pt-BR')} — {new Date(item.endDate).toLocaleDateString('pt-BR')}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.completed ? `${theme.colors.secondary}20` : `${theme.colors.warning}20` }]}>
                <Text style={[styles.statusText, { color: item.completed ? theme.colors.secondary : theme.colors.warning }]}>
                    {item.completed ? 'CONCLUÍDO' : 'PENDENTE'}
                </Text>
            </View>
        </View>
    );
  };

  if (loading) {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                <Image source={require('../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
            <Text style={styles.title}>Manutenção</Text>
            <Text style={styles.sub}>TAREFAS E BLOQUEIOS</Text>
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
                <Image source={require('../../assets/icons/hammer_inactive.png')} style={{ width: 48, height: 48, opacity: 0.3 }} resizeMode="contain" />
                <Text style={styles.emptyText}>Nenhuma tarefa registrada.</Text>
            </View>
        }
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
  sub: { color: theme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },

  list: { paddingHorizontal: 25, paddingBottom: 120 },
  card: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: theme.colors.surfaceVariant, 
      padding: 18, 
      borderRadius: 24, 
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  aptLabel: { color: theme.colors.primary, fontSize: 11, fontWeight: '900', marginBottom: 2 },
  desc: { color: '#fff', fontSize: 15, fontWeight: '700' },
  date: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 4, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '900' },

  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' }
});
