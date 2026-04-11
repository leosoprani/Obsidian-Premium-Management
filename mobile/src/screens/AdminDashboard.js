import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, RefreshControl, ScrollView, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../services/api';
import { ThemeContext } from '../styles/ThemeContext';
import { theme } from '../styles/theme';

import AdminLogsTab from './admin/AdminLogsTab';
import AdminReportTab from './admin/AdminReportTab';

const { width } = Dimensions.get('window');

function KPICard({ title, value, detail, icon, iconColor, theme }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}>
        <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconContainer, { backgroundColor: `${iconColor}15` }]}>
                <Image 
                    source={icon} 
                    style={{ width: 20, height: 20 }}
                    resizeMode="contain"
                />
            </View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>{title}</Text>
        </View>
        <Text style={[styles.kpiNumber, { color: theme.colors.text }]}>{value}</Text>
        {detail && <Text style={[styles.kpiDetail, { color: theme.colors.textTertiary }]}>{detail}</Text>}
    </View>
  );
}

export default function AdminDashboard({ onLogout }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [stats, setStats] = useState({ total: 0, pending: 0, occupancy: '84.5%' });
  const [pendingReservations, setPendingReservations] = useState([]);
  const [upcomingFlux, setUpcomingFlux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubScreen, setActiveSubScreen] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/reservations');
      const all = res.data;
      
      const pending = all.filter(r => r.status === 'pending-approval');
      setPendingReservations(pending.slice(0, 3));

      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      
      const tStr = today.toISOString().split('T')[0];
      const tmStr = tomorrow.toISOString().split('T')[0];

      // Filtra fluxo (Check-ins e Check-outs) de Hoje e Amanhã
      const flux = all.filter(r => {
        const isEntry = (r.startDate === tStr || r.startDate === tmStr) && r.status === 'confirmed';
        const isExit  = (r.endDate === tStr || r.endDate === tmStr) && (r.status === 'confirmed' || r.status === 'checked-in');
        return isEntry || isExit;
      }).map(r => ({
        ...r,
        type: r.startDate === tStr || r.startDate === tmStr ? 'IN' : 'OUT',
        isTomorrow: r.startDate === tmStr || r.endDate === tmStr
      })).sort((a, b) => b.isTomorrow ? -1 : 1);

      setUpcomingFlux(flux.slice(0, 6));

      setStats({
        total: all.length,
        pending: pending.length,
        occupancy: '84.5%' 
      });
    } catch (error) {
      console.error('Admin Load Error:', error);
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

  if (activeSubScreen === 'logs') {
      return <AdminLogsTab onBack={() => setActiveSubScreen(null)} />;
  }
  if (activeSubScreen === 'reports') {
      return <AdminReportTab onBack={() => setActiveSubScreen(null)} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView 
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={loadData} 
            tintColor={activeTheme.colors.primary} 
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
            <View>
                <Text style={[styles.welcomeText, { color: activeTheme.colors.textSecondary }]}>Olá, Administrador</Text>
                <Text style={[styles.brandTitle, { color: activeTheme.colors.text }]}>Obsidian Console</Text>
            </View>
            <TouchableOpacity style={styles.profileCircle} onPress={onLogout}>
                <LinearGradient 
                    colors={isDark ? ['#3a3a3c', '#1c1c1e'] : ['#e5e5ea', '#d1d1d6']} 
                    style={styles.profileGradient}
                >
                    <Image 
                        source={require('../../assets/icons/logout_white.png')} 
                        style={{ width: 20, height: 20 }}
                        resizeMode="contain"
                    />
                </LinearGradient>
            </TouchableOpacity>
        </View>

        <View style={styles.kpiGrid}>
            <KPICard 
                title="Ocupação" 
                value={stats.occupancy} 
                detail="▲ 4.2% vs mês anterior" 
                icon={require('../../assets/icons/dashboard_active.png')}
                iconColor={activeTheme.colors.primary}
                theme={activeTheme}
            />
            <KPICard 
                title="Pendentes" 
                value={stats.pending} 
                detail="Solicitações" 
                icon={require('../../assets/icons/reservations_active.png')}
                iconColor={activeTheme.colors.warning}
                theme={activeTheme}
            />
        </View>

        {/* --- CENTRO DE COMANDO (EXPANDIDO) --- */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: activeTheme.colors.textSecondary }]}>Fluxo de Estadias (Hoje e Amanhã)</Text>
              <View style={styles.liveIndicator}>
                 <View style={styles.liveDot} />
                 <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            
            {upcomingFlux.length > 0 ? upcomingFlux.map(res => (
              <TouchableOpacity 
                key={res.id || res._id} 
                activeOpacity={0.8}
                onPress={() => window.setActiveTab('reservations')}
              >
                <BlurView intensity={isDark ? 15 : 60} tint={isDark ? "light" : "dark"} style={[styles.miniCard, { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.glass }]}>
                <View style={[styles.miniCardIcon, { backgroundColor: res.type === 'IN' ? `${activeTheme.colors.secondary}20` : `${activeTheme.colors.error}20` }]}>
                  <Image 
                    source={res.type === 'IN' ? require('../../assets/icons/arrow_forward_active.png') : require('../../assets/icons/logout_active.png')} 
                    style={{ width: 16, height: 16 }} 
                    resizeMode="contain" 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.miniCardTitle, { color: activeTheme.colors.text }]}>{res.guestName}</Text>
                    {res.isTomorrow && <View style={[styles.tomorrowBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}><Text style={[styles.tomorrowText, { color: activeTheme.colors.textSecondary }]}>AMANHÃ</Text></View>}
                  </View>
                  <Text style={[styles.miniCardSub, { color: activeTheme.colors.textTertiary }]}>Apto {res.apartment} • {res.type === 'IN' ? 'Check-in' : 'Check-out'}</Text>
                </View>
                <Image source={require('../../assets/icons/chevron_forward_inactive.png')} style={{ width: 12, height: 12, opacity: 0.3 }} resizeMode="contain" />
                </BlurView>
              </TouchableOpacity>
            )) : (
              <Text style={[styles.emptySmall, { color: activeTheme.colors.textTertiary }]}>Sem movimentações previstas para hoje/amanhã.</Text>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 25, color: activeTheme.colors.textSecondary }]}>Aprovações Pendentes</Text>
            {pendingReservations.length > 0 ? pendingReservations.map(res => (
              <BlurView key={res.id || res._id} intensity={isDark ? 15 : 60} tint={isDark ? "dark" : "light"} style={[styles.miniCard, { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.glass }]}>
                <View style={[styles.miniCardIcon, { backgroundColor: `${activeTheme.colors.warning}20` }]}>
                  <Image source={require('../../assets/icons/dots_active.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniCardTitle, { color: activeTheme.colors.text }]}>{res.guestName}</Text>
                  <Text style={[styles.miniCardSub, { color: activeTheme.colors.textTertiary }]}>Apto {res.apartment} • Aguardando</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.miniActionBtn, { backgroundColor: activeTheme.colors.glass }]}
                    onPress={() => window.setActiveTab('reservations', 'pendentes')}
                >
                  <Text style={styles.miniActionBtnText}>Ver</Text>
                </TouchableOpacity>
              </BlurView>
            )) : (
              <Text style={[styles.emptySmall, { color: activeTheme.colors.textTertiary }]}>Tudo em dia! Nenhuma pendência.</Text>
            )}
        </View>

        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginTop: 25, color: activeTheme.colors.textSecondary }]}>Gestão e Relatórios</Text>
            
            <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]} 
                onPress={() => window.setActiveTab('guests')}
                activeOpacity={0.7}
            >
                <View style={styles.actionLayout}>
                    <View style={[styles.actionIcon, { backgroundColor: '#10b98120' }]}>
                        <Image 
                            source={require('../../assets/icons/profile_active.png')}
                            style={{ width: 22, height: 22 }}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={[styles.actionTitle, { color: activeTheme.colors.text }]}>Hóspedes CADASTRADOS</Text>
                        <Text style={[styles.actionDesc, { color: activeTheme.colors.textSecondary }]}>Base completa de clientes</Text>
                    </View>
                    <Image 
                        source={require('../../assets/icons/reservations_inactive.png')}
                        style={{ width: 14, height: 14, opacity: 0.3 }}
                        resizeMode="contain"
                    />
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]} 
                onPress={() => setActiveSubScreen('reports')}
                activeOpacity={0.7}
            >
                <View style={styles.actionLayout}>
                    <View style={[styles.actionIcon, { backgroundColor: '#8b5cf620' }]}>
                        <Image 
                            source={require('../../assets/icons/finance_active.png')}
                            style={{ width: 22, height: 22 }}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={[styles.actionTitle, { color: activeTheme.colors.text }]}>Relatório de Ocupação</Text>
                        <Text style={[styles.actionDesc, { color: activeTheme.colors.textSecondary }]}>Métricas detalhadas e projeções</Text>
                    </View>
                    <Image 
                        source={require('../../assets/icons/reservations_inactive.png')}
                        style={{ width: 14, height: 14, opacity: 0.3 }}
                        resizeMode="contain"
                    />
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]} 
                onPress={() => setActiveSubScreen('logs')}
                activeOpacity={0.7}
            >
                <View style={styles.actionLayout}>
                    <View style={[styles.actionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <Image 
                            source={require('../../assets/icons/accesses_inactive.png')}
                            style={{ width: 22, height: 22 }}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={[styles.actionTitle, { color: activeTheme.colors.text }]}>Segurança & Logs</Text>
                        <Text style={[styles.actionDesc, { color: activeTheme.colors.textSecondary }]}>Histórico de atividades do sistema</Text>
                    </View>
                    <Image 
                        source={require('../../assets/icons/reservations_inactive.png')}
                        style={{ width: 14, height: 14, opacity: 0.3 }}
                        resizeMode="contain"
                    />
                </View>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 100 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
  },
  welcomeText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '500' },
  brandTitle: { color: theme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  profileCircle: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  profileGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  kpiGrid: { 
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg, 
    gap: theme.spacing.md, 
    marginBottom: theme.spacing.xl 
  },
  kpiCard: { 
    flex: 1,
    padding: theme.spacing.lg, 
    borderRadius: theme.borderRadius.xl, 
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  kpiIconContainer: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  kpiLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  kpiNumber: { fontSize: 32, fontWeight: '800', color: theme.colors.text, letterSpacing: -1 },
  kpiDetail: { color: theme.colors.textTertiary, fontSize: 11, fontWeight: '500', marginTop: 4 },

  section: { paddingHorizontal: theme.spacing.lg },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: theme.colors.textSecondary, 
    textTransform: 'uppercase', 
    marginBottom: theme.spacing.md, 
    letterSpacing: 1 
  },
  actionCard: { 
    marginBottom: theme.spacing.md, 
    borderRadius: theme.borderRadius.lg, 
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1, 
    borderColor: theme.colors.border 
  },
  actionLayout: { flexDirection: 'row', padding: theme.spacing.md, alignItems: 'center' },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  actionText: { flex: 1 },
  actionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  actionDesc: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(52, 199, 89, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34c759' },
  liveText: { color: '#34c759', fontSize: 9, fontWeight: '900' },

  tomorrowBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tomorrowText: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '900' },

  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  miniCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${theme.colors.secondary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  miniCardTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  miniCardSub: { color: theme.colors.textTertiary, fontSize: 11, marginTop: 2, fontWeight: '600' },
  miniActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  miniActionBtnText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  emptySmall: { color: theme.colors.textTertiary, fontSize: 12, fontStyle: 'italic', marginLeft: 5 },
});
