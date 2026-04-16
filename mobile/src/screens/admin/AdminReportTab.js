import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Dimensions,
  SafeAreaView, Image
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { ThemeContext } from '../../styles/ThemeContext';
import MeshBackground from '../../components/MeshBackground';

const { width } = Dimensions.get('window');

function ReportCard({ title, value, detail, icon, iconColor }) {
    const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
    return (
        <View style={styles.cardWrapper}>
            <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                        <Image source={icon} style={{ width: 18, height: 18, tintColor: iconColor }} resizeMode="contain" />
                    </View>
                    <Text style={[styles.cardTitle, { color: activeTheme.colors.textSecondary }]}>{title}</Text>
                </View>
                <Text style={[styles.cardValue, { color: activeTheme.colors.text }]}>{value}</Text>
                {detail && <Text style={[styles.cardDetail, { color: activeTheme.colors.textTertiary }]}>{detail}</Text>}
            </View>
        </View>
    );
}

export default function AdminReportTab({ onBack }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
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
            <Text style={[styles.title, { color: activeTheme.colors.text }]}>Relatórios</Text>
            <Text style={[styles.sub, { color: activeTheme.colors.primary }]}>MATRIZ DE DESEMPENHO</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={loadData} 
                tintColor={activeTheme.colors.primary} 
            />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
            <ReportCard 
                title="Ocupação" 
                value={`${stats.occupancy}%`} 
                detail="▲ 4.2% este mês"
                icon={require('../../../assets/icons/stats_active.png')}
                iconColor={activeTheme.colors.primary}
            />
            <ReportCard 
                title="Receita" 
                value={`R$ ${stats.revenue.toLocaleString('pt-BR')}`} 
                detail="Faturamento bruto estimado"
                icon={require('../../../assets/icons/stats_active.png')}
                iconColor={activeTheme.colors.secondary}
            />
        </View>

        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: activeTheme.colors.textTertiary }]}>Distribuição de Reservas</Text>
            <View style={styles.distCardWrapper}>
                <View 
                    style={[styles.distributionCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }]}
                >
                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, { color: activeTheme.colors.textSecondary }]}>Aguardando Aprovação</Text>
                        <Text style={[styles.statValue, { color: activeTheme.colors.text }]}>{stats.pending}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: activeTheme.colors.border }]} />
                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, { color: activeTheme.colors.textSecondary }]}>Ativas / Confirmadas</Text>
                        <Text style={[styles.statValue, { color: activeTheme.colors.text }]}>{stats.active}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: activeTheme.colors.border }]} />
                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, { color: activeTheme.colors.textSecondary }]}>Total Registrado</Text>
                        <Text style={[styles.statValue, { color: activeTheme.colors.text }]}>{stats.total}</Text>
                    </View>
                </View>
            </View>
        </View>

        <View style={styles.insightWrapper}>
            <View
                style={[styles.insightBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }]}
            >
                <LinearGradient 
                    colors={[activeTheme.colors.warning + '15', 'transparent']} 
                    style={styles.insightContent}
                >
                    <View style={styles.insightHeader}>
                        <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 20, height: 20, tintColor: activeTheme.colors.warning }} resizeMode="contain" />
                        <Text style={[styles.insightTitle, { color: activeTheme.colors.warning }]}>Análise do Sistema</Text>
                    </View>
                    <Text style={[styles.insightText, { color: activeTheme.colors.textSecondary }]}>
                        A taxa de ocupação está performando acima da média sazonal. Considere otimizar as janelas de manutenção para as unidades disponíveis.
                    </Text>
                </LinearGradient>
            </View>
        </View>
      </ScrollView>
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
  sub: { color: theme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  scroll: { paddingHorizontal: theme.spacing.lg, paddingBottom: 100 },
  grid: { gap: theme.spacing.md, marginBottom: theme.spacing.xl },
  
  cardWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  card: { 
    padding: theme.spacing.lg, 
    borderRadius: 30, 
    borderWidth: 1.5, 
    overflow: 'hidden'
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: theme.spacing.sm },
  iconContainer: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  cardValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  cardDetail: { fontSize: 12, marginTop: 4, fontWeight: '500' },

  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { color: theme.colors.textTertiary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: theme.spacing.md },
  distCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  distributionCard: { 
    borderRadius: 24, 
    padding: theme.spacing.md, 
    borderWidth: 0, 
    overflow: 'hidden'
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  statLabel: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '700' },
  statValue: { color: theme.colors.text, fontSize: 15, fontWeight: '900' },
  divider: { height: 1, backgroundColor: theme.colors.border },

  insightWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  insightBox: { 
    borderRadius: 30, 
    overflow: 'hidden', 
    borderWidth: 0, 
    borderColor: `${theme.colors.warning}30` 
  },
  insightContent: { padding: theme.spacing.lg },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm },
  insightTitle: { color: theme.colors.warning, fontSize: 16, fontWeight: '800' },
  insightText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22, fontWeight: '600' }
});
