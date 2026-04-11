import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, Dimensions, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { ThemeContext } from '../../styles/ThemeContext';
import RequestReservationModal from './RequestReservationModal';

LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

const { width, height } = Dimensions.get('window');

export default function CalendarTab({ selectedApartment }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [externalEvents, setExternalEvents] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [prefillData, setPrefillData] = useState(null);
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);

  const STATUS_COLORS = {
    confirmed: activeTheme.colors.secondary,
    pending: activeTheme.colors.warning,
    'pending-approval': activeTheme.colors.warning,
    'checked-in': activeTheme.colors.primary,
    'checked-out': activeTheme.colors.accent,
    canceled: activeTheme.colors.error,
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resInternal, resExternal] = await Promise.all([
        api.get('/reservations'),
        api.get('/external-calendars')
      ]);
      
      let data = resInternal.data;
      if (selectedApartment) {
        data = data.filter(r => String(r.apartment) === String(selectedApartment));
      }
      setReservations(data);
      setExternalEvents(resExternal.data || []);
    } catch (e) {
      console.error('Erro ao carregar calendário:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedApartment]);

  useEffect(() => { loadData(); }, [loadData]);

  const markedDates = useMemo(() => {
    const marks = {};
    reservations.forEach(r => {
      const start = r.startDate;
      const end = r.endDate;
      const color = STATUS_COLORS[r.status] || activeTheme.colors.textTertiary;

      let curr = new Date(start + 'T12:00:00');
      const last = new Date(end + 'T12:00:00');

      while (curr <= last) {
        const dateStr = curr.toISOString().split('T')[0];
        if (!marks[dateStr]) {
          marks[dateStr] = { dots: [] };
        }
        marks[dateStr].dots.push({ key: String(r.id || r._id) + '-' + dateStr, color });
        curr.setDate(curr.getDate() + 1);
      }
    });

    externalEvents.forEach(e => {
      const start = e.startDate;
      const end = e.endDate;
      const dotColor = e.platform === 'airbnb' ? '#FF5A5F' : '#003580';

      let curr = new Date(start + 'T12:00:00');
      const last = new Date(end + 'T12:00:00');

      while (curr <= last) {
        const dateStr = curr.toISOString().split('T')[0];
        if (!marks[dateStr]) {
          marks[dateStr] = { dots: [] };
        }
        marks[dateStr].dots.push({ key: String(e.id) + '-' + dateStr, color: dotColor });
        curr.setDate(curr.getDate() + 1);
      }
    });

    if (selectedDate) {
      if (!marks[selectedDate]) marks[selectedDate] = {};
      marks[selectedDate] = { 
        ...marks[selectedDate], 
        selected: true, 
        selectedColor: activeTheme.colors.primary,
        customStyles: {
            container: { borderRadius: 12 },
            text: { fontWeight: '800' }
        }
      };
    }

    return marks;
  }, [reservations, selectedDate]);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const events = reservations.filter(r => {
      const start = new Date(r.startDate + 'T00:00:00');
      const end = new Date(r.endDate + 'T23:59:59');
      const d = new Date(day.dateString + 'T12:00:00');
      return d >= start && d <= end;
    });

    const exts = externalEvents.filter(e => {
        const start = new Date(e.startDate + 'T00:00:00');
        const end = new Date(e.endDate + 'T23:59:59');
        const d = new Date(day.dateString + 'T12:00:00');
        return d >= start && d <= end;
    });

    setSelectedEvents([...events, ...exts]);
  };

  const handleExternalClick = (event) => {
    Alert.alert(
      'Reserva Externa',
      `Esta é uma reserva do ${event.platform.toUpperCase()}. Deseja realizar o cadastro completo no sistema?`,
      [
        { text: 'Agora não', style: 'cancel' },
        { 
          text: 'Fazer Cadastro', 
          onPress: () => {
            setPrefillData({
              apartment: event.apartment,
              startDate: event.startDate,
              endDate: event.endDate,
              notes: `Reserva importada do ${event.platform.toUpperCase()}`,
              status: 'pending-approval'
            });
            setShowRequestModal(true);
          } 
        }
      ]
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
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[styles.floatingHeader, { borderBottomColor: activeTheme.colors.border }]}>
        <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
                <View>
                    <Text style={[styles.headerSub, { color: activeTheme.colors.primary }]}>DISPONIBILIDADE</Text>
                    <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>Calendário</Text>
                </View>
                <TouchableOpacity 
                    activeOpacity={0.7} 
                    style={[styles.actionBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}
                >
                    <Image 
                        source={require('../../../assets/icons/filter_active.png')} 
                        style={{ width: 20, height: 20 }} 
                        resizeMode="contain" 
                    />
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
                onRefresh={() => { setRefreshing(true); loadData(); }} 
                tintColor={activeTheme.colors.primary} 
            />
        }
      >
        <View style={[styles.calendarCardWrap, { marginTop: height * 0.18 }]}>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.calendarCard, { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.glass }]}>
                <Calendar
                    markingType={'multi-dot'}
                    markedDates={markedDates}
                    onDayPress={onDayPress}
                    theme={{
                        backgroundColor: 'transparent',
                        calendarBackground: 'transparent',
                        textSectionTitleColor: activeTheme.colors.textTertiary,
                        selectedDayBackgroundColor: activeTheme.colors.primary,
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: activeTheme.colors.primary,
                        dayTextColor: activeTheme.colors.text,
                        textDisabledColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        dotColor: activeTheme.colors.primary,
                        monthTextColor: activeTheme.colors.text,
                        indicatorColor: activeTheme.colors.primary,
                        textDayFontWeight: '600',
                        textMonthFontWeight: '900',
                        textDayHeaderFontWeight: '700',
                        textDayFontSize: 15,
                        textMonthFontSize: 18,
                        textDayHeaderFontSize: 11,
                        arrowColor: activeTheme.colors.primary,
                    }}
                />
            </BlurView>
        </View>

        <View style={styles.eventSection}>
            <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: activeTheme.colors.textTertiary }]}>
                    {selectedDate ? `DETALHES: ${selectedDate.split('-').reverse().join('/')}` : 'SELECIONE UMA DATA'}
                </Text>
                <View style={[styles.headerLine, { backgroundColor: activeTheme.colors.border }]} />
            </View>

            {selectedEvents.length > 0 ? (
                selectedEvents.map((item, idx) => {
                    const isExternal = item.status === 'external';
                    const platformIcon = item.platform === 'airbnb' ? require('../../../assets/icons/airbnb_active.png') : require('../../../assets/icons/globe_active.png');
                    const iconColor = item.platform === 'airbnb' ? '#FF5A5F' : (isExternal ? '#003580' : activeTheme.colors.textTertiary);

                    return (
                        <TouchableOpacity 
                            key={idx} 
                            activeOpacity={0.8}
                            style={styles.eventCardContainer}
                            onPress={() => isExternal ? handleExternalClick(item) : null}
                        >
                            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.eventCard, { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.glass }]}>
                                <View 
                                    style={[
                                        styles.statusIndicator, 
                                        { backgroundColor: isExternal ? iconColor : (STATUS_COLORS[item.status] || activeTheme.colors.textTertiary) }
                                    ]} 
                                />
                                <View style={styles.eventInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        {isExternal && (
                                            <Image 
                                                source={platformIcon} 
                                                style={{ width: 14, height: 14 }} 
                                                resizeMode="contain" 
                                            />
                                        )}
                                        <Text style={[styles.eventApt, { color: activeTheme.colors.text }]}>Apartamento {item.apartment}</Text>
                                    </View>
                                    <Text style={[styles.eventGuest, { color: activeTheme.colors.textSecondary }]} numberOfLines={1}>
                                        {isExternal ? `Reserva ${item.platform.toUpperCase()}` : (item.guestName || 'Hóspede Particular')}
                                    </Text>
                                </View>
                                <View style={styles.chevronWrap}>
                                    <Image 
                                        source={require('../../../assets/icons/reservations_inactive.png')} 
                                        style={{ width: 12, height: 12, opacity: 0.3 }} 
                                        resizeMode="contain" 
                                    />
                                </View>
                            </BlurView>
                        </TouchableOpacity>
                    );
                })
            ) : selectedDate ? (
                <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={[styles.emptyCard, { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.glass }]}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: activeTheme.colors.glassSecondary }]}>
                        <Image 
                            source={require('../../../assets/icons/reservations_inactive.png')} 
                            style={{ width: 32, height: 32, opacity: 0.3 }} 
                            resizeMode="contain" 
                        />
                    </View>
                    <Text style={[styles.emptyText, { color: activeTheme.colors.text }]}>Sem ocupação Registrada</Text>
                    <Text style={[styles.emptySub, { color: activeTheme.colors.textTertiary }]}>Esta unidade está disponível para reserva neste dia.</Text>
                </BlurView>
            ) : (
                <View style={styles.placeholderCard}>
                    <Image 
                        source={require('../../../assets/icons/arrow_up_inactive.png')} 
                        style={{ width: 32, height: 32, opacity: 0.3 }} 
                        resizeMode="contain" 
                    />
                    <Text style={[styles.placeholderText, { color: activeTheme.colors.textTertiary }]}>Selecione um dia no calendário para gerenciar.</Text>
                </View>
            )}
        </View>

        <RequestReservationModal 
            visible={showRequestModal}
            onClose={() => { setShowRequestModal(false); setPrefillData(null); }}
            onSuccess={() => { setShowRequestModal(false); setPrefillData(null); loadData(); }}
            initialData={prefillData}
            userRole="owner"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
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
  actionBtn: { 
    width: 44, height: 44, borderRadius: 14, 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  
  scrollContent: { paddingBottom: 150 },
  calendarCardWrap: { paddingHorizontal: 20, marginBottom: 30 },
  calendarCard: { 
    borderRadius: 32,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.01)'
  },
  
  eventSection: { paddingHorizontal: 25 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  headerLine: { flex: 1, height: 1 },
  
  eventCardContainer: { marginBottom: 16 },
  eventCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden'
  },
  statusIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 18 },
  eventInfo: { flex: 1 },
  eventApt: { fontSize: 18, fontWeight: '800' },
  eventGuest: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  chevronWrap: { opacity: 0.5 },
  
  emptyCard: { 
    padding: 30, 
    alignItems: 'center', 
    borderRadius: 30, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden'
  },
  emptyIconCircle: { 
    width: 64, height: 64, 
    borderRadius: 32, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 15 
  },
  emptyText: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  placeholderCard: { padding: 40, alignItems: 'center', opacity: 0.4 },
  placeholderText: { fontSize: 14, textAlign: 'center', marginTop: 15, fontWeight: '600' }
});
