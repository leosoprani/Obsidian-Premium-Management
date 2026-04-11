import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Dimensions,
  SafeAreaView, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');

function ReportCard({ title, value, detail, icon, iconColor }) {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                    <Image source={icon} style={{ width: 18, height: 18 }} resizeMode="contain" />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <Text style={styles.cardValue}>{value}</Text>
            {detail && <Text style={styles.cardDetail}>{detail}</Text>}
        </View>
    );
}

export default function AdminReportTab({ onBack }) {
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, occupancy: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/reservations');
      const all = res.data;
      const active = all.filter(r => r.status === 'confirmed' || r.status === 'checked-in').length;
      const pending = all.filter(r => r.status === 'pending-approval').length;
      
      setStats({
        total: all.length,
        pending: pending,
        active: active,
        occupancy: 84.5,
        revenue: 12450.00
      });
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
        <View style={styles.centered}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Image source={require('../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </TouchableOpacity>
        <View>
            <Text style={styles.title}>Relatórios</Text>
            <Text style={styles.sub}>MATRIZ DE DESEMPENHO</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={loadData} 
                tintColor={theme.colors.primary} 
            />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
            <ReportCard 
                title="Ocupação" 
                value={`${stats.occupancy}%`} 
                detail="▲ 4.2% este mês"
                icon={require('../../assets/icons/stats_active.png')}
                iconColor={theme.colors.primary}
            />
            <ReportCard 
                title="Receita" 
                value={`R$ ${stats.revenue.toLocaleString('pt-BR')}`} 
                detail="Faturamento bruto estimado"
                icon={require('../../assets/icons/stats_active.png')}
                iconColor={theme.colors.secondary}
            />
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distribuição de Reservas</Text>
            <View style={styles.distributionCard}>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Aguardando Aprovação</Text>
                    <Text style={styles.statValue}>{stats.pending}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Ativas / Confirmadas</Text>
                    <Text style={styles.statValue}>{stats.active}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total Registrado</Text>
                    <Text style={styles.statValue}>{stats.total}</Text>
                </View>
            </View>
        </View>

        <View style={styles.insightBox}>
            <LinearGradient 
                colors={['rgba(255,159,10,0.1)', 'rgba(255,159,10,0.05)']} 
                style={styles.insightContent}
            >
                <View style={styles.insightHeader}>
                    <Image source={require('../../assets/icons/dots_active.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    <Text style={styles.insightTitle}>Análise do Sistema</Text>
                </View>
                <Text style={styles.insightText}>
                    A taxa de ocupação está performando acima da média sazonal. Considere otimizar as janelas de manutenção para as unidades disponíveis.
                </Text>
            </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: theme.spacing.lg, 
    paddingTop: theme.spacing.md, 
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md 
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: theme.colors.surfaceVariant, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  sub: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  scroll: { paddingHorizontal: theme.spacing.lg, paddingBottom: 100 },
  grid: { gap: theme.spacing.md, marginBottom: theme.spacing.xl },
  
  card: { 
    padding: theme.spacing.lg, 
    borderRadius: theme.borderRadius.xl, 
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: theme.spacing.sm },
  iconContainer: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  cardValue: { color: theme.colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  cardDetail: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 4, fontWeight: '500' },

  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { color: theme.colors.textTertiary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: theme.spacing.md },
  distributionCard: { 
    borderRadius: theme.borderRadius.lg, 
    backgroundColor: theme.colors.surfaceVariant, 
    padding: theme.spacing.md, 
    borderWidth: 1, 
    borderColor: theme.colors.border 
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  statLabel: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '500' },
  statValue: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: theme.colors.border },

  insightBox: { borderRadius: theme.borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: `${theme.colors.warning}30` },
  insightContent: { padding: theme.spacing.lg },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm },
  insightTitle: { color: theme.colors.warning, fontSize: 16, fontWeight: '700' },
  insightText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22, fontWeight: '500' }
});
