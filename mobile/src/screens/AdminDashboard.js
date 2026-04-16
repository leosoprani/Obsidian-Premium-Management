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
import MeshBackground from '../components/MeshBackground';
import { useTabBarScroll } from '../hooks/useTabBarScroll';

import AdminLogsTab from './admin/AdminLogsTab';
import AdminReportTab from './admin/AdminReportTab';
import AddGuestModal from './owner/AddGuestModal';
import RequestReservationModal from './owner/RequestReservationModal';

const { width } = Dimensions.get('window');

const KPICard = ({ label, value, detail, icon, color, activeTheme, onPress }) => (
    <TouchableOpacity activeOpacity={0.8} style={styles.kpiCardWrapper} onPress={onPress}>
        <View 
            style={[styles.kpiCard, { backgroundColor: 'rgba(255,255,255,0.04)' }]}
        >
            <View style={styles.kpiHeader}>
                <View style={[styles.kpiIconContainer, { backgroundColor: `${color}15` }]}>
                    <Image source={icon} style={{ width: 18, height: 18, tintColor: color }} resizeMode="contain" />
                </View>
                <Text style={[styles.kpiLabel, { color: activeTheme.colors.textSecondary }]}>{label}</Text>
            </View>
            <Text style={[styles.kpiNumber, { color: activeTheme.colors.text }]}>{value !== undefined && value !== null ? value : 0}</Text>
            <Text style={[styles.kpiDetail, { color: activeTheme.colors.textTertiary }]}>{detail}</Text>
        </View>
    </TouchableOpacity>
);

const ActionCard = ({ title, desc, icon, color, onPress, activeTheme }) => (
    <View style={styles.actionCardWrapper}>
        <View 
            style={[styles.actionCard, { backgroundColor: 'rgba(255,255,255,0.04)' }]}
        >
            <TouchableOpacity 
                onPress={onPress} 
                style={styles.actionLayout} 
                activeOpacity={0.7}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
                    <Image source={icon} style={{ width: 24, height: 24, tintColor: color }} resizeMode="contain" />
                </View>
                <View style={styles.actionText}>
                    <Text style={[styles.actionTitle, { color: activeTheme.colors.text }]}>{title}</Text>
                    <Text style={[styles.actionDesc, { color: activeTheme.colors.textSecondary }]}>{desc}</Text>
                </View>
                <Image source={require('./../../assets/icons/chevron_forward_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.textTertiary, opacity: 0.3 }} resizeMode="contain" />
            </TouchableOpacity>
        </View>
    </View>
);

export default function AdminDashboard({ onLogout }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const { handleScroll } = useTabBarScroll();
  const [stats, setStats] = useState({ total: 0, pending: 0, occupancy: '84.5%' });
  const [pendingReservations, setPendingReservations] = useState([]);
  const [upcomingFlux, setUpcomingFlux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubScreen, setActiveSubScreen] = useState(null);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showAddResModal, setShowAddResModal] = useState(false);

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

      const checkoutsCount = flux.filter(r => r.type === 'OUT').length;
      setUpcomingFlux(flux.slice(0, 6));

      setStats({
        total: all.length,
        pending: pending.length,
        checkouts: checkoutsCount,
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
      <View style={styles.container}>
        <MeshBackground colors={activeTheme.colors.mesh} />
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <View style={[styles.centered, { backgroundColor: 'transparent' }]}>
            <ActivityIndicator size="small" color={activeTheme.colors.primary} />
          </View>
        </SafeAreaView>
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
    <View style={styles.container}>
      <MeshBackground colors={activeTheme.colors.mesh} />
      <SafeAreaView style={{ flex: 1 }}>
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
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.header}>
            <View>
                <Text style={[styles.welcomeText, { color: activeTheme.colors.textSecondary }]}>Olá, Administrador</Text>
                <Text style={[styles.brandTitle, { color: activeTheme.colors.text }]}>Obsidian Console</Text>
            </View>
            <TouchableOpacity style={styles.profileCircle} onPress={onLogout}>
                <LinearGradient 
                    colors={[activeTheme.colors.glassSecondary, activeTheme.colors.glass]} 
                    style={[styles.profileGradient, { borderColor: activeTheme.colors.glassBorder, borderWidth: 1, borderRadius: 22 }]}
                >
                    <Image 
                        source={require('../../assets/icons/logout_active.png')} 
                        style={{ width: 18, height: 18, tintColor: activeTheme.colors.error }}
                        resizeMode="contain"
                    />
                </LinearGradient>
            </TouchableOpacity>
        </View>

        <View style={styles.kpiGrid}>
                <KPICard 
                    label="Reservas" 
                    value={stats.pending || 0} 
                    detail="Pendentes de Aprovação" 
                    icon={require('../../assets/icons/reservations_active.png')} 
                    color={activeTheme.colors.primary} 
                    activeTheme={activeTheme}
                    onPress={() => window.setActiveTab && window.setActiveTab('reservations')}
                />
                <KPICard 
                    label="Checkout" 
                    value={stats.checkouts || 0} 
                    detail="Próximas 24 horas" 
                    icon={require('../../assets/icons/cleaning_active.png')} 
                    color={activeTheme.colors.secondary} 
                    activeTheme={activeTheme}
                    onPress={() => window.setActiveTab && window.setActiveTab('reservations')}
                />
        </View>

        {/* --- CENTRO DE COMANDO (EXPANDIDO) --- */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: activeTheme.colors.textSecondary }]}>Fluxo de Estadias (Hoje e Amanhã)</Text>
              <View style={[styles.liveIndicator, { backgroundColor: activeTheme.colors.secondary + '20' }]}>
                 <View style={[styles.liveDot, { backgroundColor: activeTheme.colors.secondary }]} />
                 <Text style={[styles.liveText, { color: activeTheme.colors.secondary }]}>LIVE</Text>
              </View>
            </View>
            
            {upcomingFlux.length > 0 ? upcomingFlux.map(res => (
              <TouchableOpacity 
                key={res.id || res._id} 
                activeOpacity={0.8}
                onPress={() => window.setActiveTab('reservations')}
                style={styles.miniCardWrapper}
              >
                <View 
                    style={[styles.miniCard, { borderColor: activeTheme.colors.glassBorder, backgroundColor: activeTheme.colors.glass }]}
                >
                    <View style={[styles.miniCardIcon, { backgroundColor: res.type === 'IN' ? `${activeTheme.colors.secondary}20` : `${activeTheme.colors.error}20` }]}>
                    <Image 
                        source={res.type === 'IN' ? require('../../assets/icons/arrow_forward_active.png') : require('../../assets/icons/logout_active.png')} 
                        style={{ width: 16, height: 16, tintColor: res.type === 'IN' ? activeTheme.colors.secondary : activeTheme.colors.error }} 
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
                    <Image source={require('../../assets/icons/chevron_forward_active.png')} style={{ width: 12, height: 12, tintColor: activeTheme.colors.textTertiary }} resizeMode="contain" />
                </View>
              </TouchableOpacity>
            )) : (
              <Text style={[styles.emptySmall, { color: activeTheme.colors.textTertiary }]}>Sem movimentações previstas para hoje/amanhã.</Text>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 25, color: activeTheme.colors.textSecondary }]}>Aprovações Pendentes</Text>
            {pendingReservations.length > 0 ? pendingReservations.map(res => (
              <View key={res.id || res._id} style={styles.miniCardWrapper}>
                <View 
                    style={[styles.miniCard, { borderColor: activeTheme.colors.glassBorder, backgroundColor: activeTheme.colors.glass }]}
                >
                    <View style={[styles.miniCardIcon, { backgroundColor: `${activeTheme.colors.warning}20` }]}>
                    <Image source={require('../../assets/icons/dots_active.png')} style={{ width: 16, height: 16, tintColor: activeTheme.colors.warning }} resizeMode="contain" />
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
                </View>
              </View>
            )) : (
              <Text style={[styles.emptySmall, { color: activeTheme.colors.textTertiary }]}>Tudo em dia! Nenhuma pendência.</Text>
            )}
        </View>

        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: activeTheme.colors.textSecondary }]}>Atalhos Operacionais</Text>
            
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 25 }}>
                <TouchableOpacity 
                    onPress={() => setShowAddResModal(true)}
                    activeOpacity={0.8}
                    style={{ flex: 1 }}
                >
                    <LinearGradient
                        colors={[activeTheme.colors.primary, '#0055ff']}
                        style={{ borderRadius: 20, padding: 18, alignItems: 'center', gap: 8, height: 110, justifyContent: 'center' }}
                    >
                        <Image source={require('../../assets/icons/add_white.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center' }}>NOVA RESERVA</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setShowAddGuestModal(true)}
                    activeOpacity={0.8}
                    style={{ flex: 1 }}
                >
                    <View
                        style={{ borderRadius: 20, padding: 18, alignItems: 'center', gap: 8, backgroundColor: activeTheme.colors.glass, borderWidth: 1, borderColor: activeTheme.colors.glassBorder, height: 110, justifyContent: 'center' }}
                    >
                        <Image source={require('../../assets/icons/person_active.png')} style={{ width: 20, height: 20, tintColor: activeTheme.colors.text }} resizeMode="contain" />
                        <Text style={{ color: activeTheme.colors.text, fontSize: 13, fontWeight: '900', textAlign: 'center' }}>CADASTRO HÓSPEDE</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 10, color: activeTheme.colors.textSecondary }]}>Gestão e Relatórios</Text>
            
            <TouchableOpacity 
                onPress={() => window.setActiveTab('guests')}
                activeOpacity={0.7}
                style={[styles.actionCardWrapper, { marginBottom: 15 }]}
            >
                <View style={[styles.actionCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }]}>
                    <View style={styles.actionLayout}>
                        <View style={[styles.actionIcon, { backgroundColor: activeTheme.colors.secondary + '20' }]}>
                            <Image 
                                source={require('../../assets/icons/profile_active.png')}
                                style={{ width: 22, height: 22, tintColor: activeTheme.colors.primary}}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: activeTheme.colors.text }]}>Hóspedes CADASTRADOS</Text>
                            <Text style={[styles.actionDesc, { color: activeTheme.colors.textSecondary }]}>Base completa de clientes</Text>
                        </View>
                        <Image 
                            source={require('../../assets/icons/chevron_forward_active.png')}
                            style={{ width: 14, height: 14, tintColor: activeTheme.colors.textTertiary }}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => setActiveSubScreen('reports')}
                activeOpacity={0.7}
                style={[styles.actionCardWrapper, { marginBottom: 15 }]}
            >
                <View style={[styles.actionCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }]}>
                    <View style={styles.actionLayout}>
                        <View style={[styles.actionIcon, { backgroundColor: activeTheme.colors.accent + '20' }]}>
                            <Image 
                                source={require('../../assets/icons/finance_active.png')}
                                style={{ width: 22, height: 22, tintColor: activeTheme.colors.accent }}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: activeTheme.colors.text }]}>Relatório de Ocupação</Text>
                            <Text style={[styles.actionDesc, { color: activeTheme.colors.textSecondary }]}>Métricas detalhadas e projeções</Text>
                        </View>
                        <Image 
                            source={require('../../assets/icons/chevron_forward_active.png')}
                            style={{ width: 14, height: 14, tintColor: activeTheme.colors.textTertiary }}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => window.setActiveTab('users')}
                activeOpacity={0.7}
                style={[styles.actionCardWrapper, { marginBottom: 15 }]}
            >
                <View style={[styles.actionCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }]}>
                    <View style={styles.actionLayout}>
                        <View style={[styles.actionIcon, { backgroundColor: activeTheme.colors.primary + '20' }]}>
                            <Image 
                                source={require('../../assets/icons/accesses_active.png')}
                                style={{ width: 22, height: 22, tintColor: activeTheme.colors.primary }}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: activeTheme.colors.text }]}>Gestão de Usuários e Acessos</Text>
                            <Text style={[styles.actionDesc, { color: activeTheme.colors.textSecondary }]}>Criar logins e gerenciar permissões</Text>
                        </View>
                        <Image 
                            source={require('../../assets/icons/chevron_forward_active.png')}
                            style={{ width: 14, height: 14, tintColor: activeTheme.colors.textTertiary }}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => setActiveSubScreen('logs')}
                activeOpacity={0.7}
                style={[styles.actionCardWrapper, { marginBottom: 15 }]}
            >
                <View style={[styles.actionCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }]}>
                    <View style={styles.actionLayout}>
                        <View style={[styles.actionIcon, { backgroundColor: activeTheme.colors.textTertiary + '10' }]}>
                            <Image 
                                source={require('../../assets/icons/accesses_inactive.png')}
                                style={{ width: 22, height: 22, tintColor: activeTheme.colors.textSecondary }}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: activeTheme.colors.text }]}>Segurança & Logs</Text>
                            <Text style={[styles.actionDesc, { color: activeTheme.colors.textSecondary }]}>Histórico de atividades do sistema</Text>
                        </View>
                        <Image 
                            source={require('../../assets/icons/chevron_forward_active.png')}
                            style={{ width: 14, height: 14, tintColor: activeTheme.colors.textTertiary }}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </TouchableOpacity>
        </View>
        </ScrollView>
      </SafeAreaView>

      <AddGuestModal 
          visible={showAddGuestModal}
          onClose={() => setShowAddGuestModal(false)}
          onSuccess={() => { setShowAddGuestModal(false); loadData(); }}
      />

      <RequestReservationModal 
          visible={showAddResModal}
          onClose={() => setShowAddResModal(false)}
          onSuccess={() => { setShowAddResModal(false); loadData(); }}
          isAdmin={true}
      />

      <StatusBar style="light" />
    </View>
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
  kpiCardWrapper: {
    flex: 1,
    borderRadius: 30,
  },
  kpiCard: { 
    padding: theme.spacing.lg, 
    borderRadius: 30, 
    borderWidth: 0,
    overflow: 'hidden',
    minHeight: 140, // Uniform height for KPI cards
    justifyContent: 'space-between'
  },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  kpiIconContainer: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  kpiLabel: { fontSize: 13, fontWeight: '700' },
  kpiNumber: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  kpiDetail: { fontSize: 11, fontWeight: '700', marginTop: 4 },

  section: { paddingHorizontal: theme.spacing.lg },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: theme.colors.textSecondary, 
    textTransform: 'uppercase', 
    marginBottom: theme.spacing.md, 
    letterSpacing: 1 
  },
  actionCardWrapper: {
    marginBottom: theme.spacing.md, 
    borderRadius: 30,
  },
  actionCard: { 
    borderRadius: 30, 
    borderWidth: 0, 
    overflow: 'hidden',
  },
  actionLayout: { flexDirection: 'row', padding: theme.spacing.md, alignItems: 'center' },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  actionText: { flex: 1 },
  actionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  actionDesc: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(52, 199, 89, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34c759' },
  liveText: { color: '#34c759', fontSize: 9, fontWeight: '900' },

  tomorrowBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tomorrowText: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '900' },

  miniCardWrapper: {
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
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
