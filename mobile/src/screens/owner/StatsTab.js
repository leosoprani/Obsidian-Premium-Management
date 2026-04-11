import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, Dimensions, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';

const { width, height } = Dimensions.get('window');

function StatCard({ label, value, sub, icon, iconColor, activeTheme }) {
  return (
    <BlurView intensity={20} tint={activeTheme.dark ? "dark" : "light"} style={[styles.statCard, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${iconColor}20` }]}>
        <Image 
          source={icon} 
          style={{ width: 18, height: 18 }} 
          resizeMode="contain" 
        />
      </View>
      <Text style={[styles.statValue, { color: activeTheme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: activeTheme.colors.textTertiary }]}>{label.toUpperCase()}</Text>
      {sub && (
        <View style={styles.statSubRow}>
            <Image 
                source={require('../../../assets/icons/arrow_up_active.png')} 
                style={{ width: 10, height: 10 }} 
                resizeMode="contain" 
            />
            <Text style={[styles.statSub, { color: activeTheme.colors.secondary }]}>{sub}</Text>
        </View>
      )}
    </BlurView>
  );
}

export default function StatsTab({ selectedApartment }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [stats, setStats] = useState({
    totalReservations: 0,
    confirmedReservations: 0,
    occupancy: '0%',
    revenue: '0,00',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/reservations');
      let all = res.data;

      if (selectedApartment) {
        all = all.filter(r => String(r.apartment) === String(selectedApartment));
      }

      const confirmed = all.filter(r => r.status === 'confirmed' || r.status === 'checked-in');
      const totalRevenue = confirmed.reduce((acc, r) => acc + (Number(r.price) || 0), 0);

      setStats({
        totalReservations: all.length,
        confirmedReservations: confirmed.length,
        occupancy: all.length > 0 ? `${Math.round((confirmed.length / Math.max(all.length, 1)) * 100)}%` : '0%',
        revenue: totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      });
    } catch (e) {
      console.error('Erro ao carregar estatísticas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedApartment]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
        <View style={[styles.centered, { backgroundColor: activeTheme.colors.background }]}>
            <ActivityIndicator size="small" color={activeTheme.colors.primary} />
        </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[styles.floatingHeader, { borderBottomColor: activeTheme.colors.border }]}>
        <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
                <View>
                    <Text style={[styles.headerSub, { color: activeTheme.colors.primary }]}>INSIGHTS</Text>
                    <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>Analytics</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} style={styles.filterBtn}>
                    <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.filterInner, { borderColor: activeTheme.colors.border }]}>
                        <Image 
                            source={require('../../../assets/icons/filter_active.png')} 
                            style={{ width: 20, height: 20 }} 
                            resizeMode="contain" 
                        />
                    </BlurView>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => { setRefreshing(true); loadStats(); }} 
                tintColor={activeTheme.colors.primary} 
            />
        }
      >
        <View style={[styles.heroSection, { paddingTop: height * 0.18 }]}>
          <Text style={[styles.heroTitle, { color: activeTheme.colors.text }]}>Performance</Text>
          <Text style={[styles.heroSub, { color: activeTheme.colors.textTertiary }]}>Métricas de ocupação e rentabilidade</Text>
        </View>

        <View style={styles.gridRow}>
          <StatCard 
            label="Reservas" 
            value={stats.totalReservations} 
            icon={require('../../../assets/icons/reservations_active.png')} 
            iconColor={activeTheme.colors.primary}
            activeTheme={activeTheme}
          />
          <StatCard 
            label="Ocupação" 
            value={stats.occupancy} 
            sub="12.4% vs mês ant." 
            icon={require('../../../assets/icons/stats_active.png')} 
            iconColor={activeTheme.colors.secondary}
            activeTheme={activeTheme}
          />
        </View>

        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.revenueBox, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
          <View style={styles.revHeader}>
            <Text style={[styles.revLabel, { color: activeTheme.colors.textTertiary }]}>FATURAMENTO BRUTO</Text>
            <View style={[styles.growthBadge, { backgroundColor: activeTheme.colors.secondary + '20' }]}>
                <Image 
                    source={require('../../../assets/icons/arrow_up_active.png')} 
                    style={{ width: 10, height: 10 }} 
                    resizeMode="contain" 
                />
                <Text style={[styles.growthText, { color: activeTheme.colors.secondary }]}>+8.2%</Text>
            </View>
          </View>
          
          <View style={styles.revenueContainer}>
            <Text style={[styles.revSymbol, { color: activeTheme.colors.primary }]}>R$</Text>
            <Text style={[styles.revValue, { color: activeTheme.colors.text }]}>{stats.revenue}</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: activeTheme.colors.glassSecondary }]}>
                <LinearGradient 
                    colors={[activeTheme.colors.primary, '#0055ff']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 0}}
                    style={[styles.progressInner, { width: '75%' }]} 
                />
            </View>
            <View style={styles.progressFooter}>
                <Text style={[styles.progressLabel, { color: activeTheme.colors.textTertiary }]}>75% da meta mensal</Text>
                <Text style={[styles.progressTarget, { color: activeTheme.colors.primary }]}>META R$ 16.5k</Text>
            </View>
          </View>
        </BlurView>

        <View style={styles.insightSection}>
            <Text style={[styles.sectionTitle, { color: activeTheme.colors.textTertiary }]}>SUGESTÕES DO SISTEMA</Text>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.insightCard, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                <LinearGradient
                    colors={[activeTheme.colors.warning + '30', 'transparent']}
                    style={styles.insightIconWrap}
                >
                    <Image 
                        source={require('../../../assets/icons/bulb_active.png')} 
                        style={{ width: 24, height: 24 }} 
                        resizeMode="contain" 
                    />
                </LinearGradient>
                <View style={styles.insightTextWrap}>
                    <Text style={[styles.insightTitle, { color: activeTheme.colors.text }]}>Ajuste Tarifário</Text>
                    <Text style={[styles.insightBody, { color: activeTheme.colors.textSecondary }]}>
                        A procura para o próximo feriado está 40% acima da média. 
                        Considere um ajuste de 15% nas diárias.
                    </Text>
                </View>
            </BlurView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  headerSub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  filterBtn: { borderRadius: 12, overflow: 'hidden' },
  filterInner: { padding: 10, borderHorizontal: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  
  scrollContent: { paddingBottom: 120 },
  heroSection: { paddingHorizontal: 25, marginBottom: 30 },
  heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  heroSub: { fontSize: 15, marginTop: 4, fontWeight: '600' },
 
  gridRow: { flexDirection: 'row', gap: 15, paddingHorizontal: 25, marginBottom: 15 },
  statCard: { 
    flex: 1, 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)'
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statLabel: { fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
  statSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  statSub: { fontSize: 11, fontWeight: '700' },
 
  revenueBox: { 
    marginHorizontal: 25,
    padding: 24, 
    borderRadius: 32, 
    marginBottom: 40, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)'
  },
  revHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  revLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  growthBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(52, 211, 153, 0.1)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6,
    gap: 4
  },
  growthText: { fontSize: 10, fontWeight: '800' },
  
  revenueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 30 },
  revSymbol: { fontSize: 20, fontWeight: '800' },
  revValue: { fontSize: 36, fontWeight: '900', letterSpacing: -1.5 },
 
  progressContainer: { gap: 12 },
  progressBar: { height: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 5, overflow: 'hidden' },
  progressInner: { height: '100%', borderRadius: 5 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, fontWeight: '700' },
  progressTarget: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
 
  insightSection: { paddingHorizontal: 25 },
  sectionTitle: { 
    fontSize: 10, 
    fontWeight: '900', 
    marginBottom: 15, 
    letterSpacing: 1.5 
  },
  insightCard: { 
    flexDirection: 'row', 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)', 
    gap: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)'
  },
  insightIconWrap: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  insightTextWrap: { flex: 1 },
  insightTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  insightBody: { fontSize: 14, lineHeight: 20, fontWeight: '600' }
});
