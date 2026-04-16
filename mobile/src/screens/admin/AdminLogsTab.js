import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity,
  SafeAreaView, Image
} from 'react-native';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { ThemeContext } from '../../styles/ThemeContext';
import MeshBackground from '../../components/MeshBackground';

function LogItem({ item }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const msg = item.message || '';
  const level = item.level || 'info';
  const isError = level.toLowerCase() === 'error' || msg.toLowerCase().includes('erro');
  
  return (
    <View style={[styles.logCard, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
        <View style={styles.logHeader}>
            <View style={[styles.badge, { backgroundColor: isError ? `${activeTheme.colors.error}15` : `${activeTheme.colors.secondary}15` }]}>
                <View style={[styles.dot, { backgroundColor: isError ? activeTheme.colors.error : activeTheme.colors.secondary }]} />
                <Text style={[styles.badgeText, { color: isError ? activeTheme.colors.error : activeTheme.colors.secondary }]}>
                    {level.toUpperCase()}
                </Text>
            </View>
            <Text style={[styles.timestamp, { color: activeTheme.colors.textTertiary }]}>
                {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </View>
        
        <Text style={[styles.logMessage, { color: activeTheme.colors.text }]}>{item.message}</Text>
        
        <View style={[styles.logFooter, { borderTopColor: activeTheme.colors.glassBorder }]}>
            {item.username && (
                <View style={styles.userRow}>
                    <Image source={require('../../../assets/icons/person_active.png')} style={{ width: 12, height: 12, tintColor: activeTheme.colors.textSecondary, opacity: 0.5 }} resizeMode="contain" />
                    <Text style={[styles.usernameText, { color: activeTheme.colors.textSecondary }]}>{item.username}</Text>
                </View>
            )}
            <Text style={[styles.dateText, { color: activeTheme.colors.textTertiary }]}>
                {new Date(item.timestamp).toLocaleDateString('pt-BR')}
            </Text>
        </View>
    </View>
  );
}

export default function AdminLogsTab({ onBack }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/logs');
      setLogs(res.data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder,  }]} activeOpacity={0.7}>
            <Image source={require('../../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24, tintColor: activeTheme.colors.primary}} resizeMode="contain" />
        </TouchableOpacity>
        <View>
            <Text style={[styles.title, { color: activeTheme.colors.text }]}>Logs de Atividade</Text>
            <Text style={[styles.sub, { color: activeTheme.colors.primary }]}>AUDITORIA DO SISTEMA</Text>
        </View>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item, idx) => item._id || String(idx)}
        renderItem={({ item }) => <LogItem item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={loadData} 
                tintColor={activeTheme.colors.primary} 
            />
        }
        ListEmptyComponent={
            <View style={styles.empty}>
                <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 48, height: 48, tintColor: activeTheme.colors.textTertiary, opacity: 0.3 }} resizeMode="contain" />
                <Text style={[styles.emptyText, { color: activeTheme.colors.textTertiary }]}>Nenhum registro encontrado.</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 60, 
    paddingBottom: 20
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15,  },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  sub: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: 50 },
  logCard: { 
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    overflow: 'hidden'
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  timestamp: { color: theme.colors.textTertiary, fontSize: 11, fontWeight: '600' },
  
  logMessage: { color: theme.colors.text, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  
  logFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  usernameText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  dateText: { color: theme.colors.textTertiary, fontSize: 11, fontWeight: '500' },
  
  empty: { marginTop: 100, alignItems: 'center', gap: theme.spacing.md },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '500' }
});
