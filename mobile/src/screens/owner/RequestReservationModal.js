import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, Alert, ActivityIndicator, Platform,
  KeyboardAvoidingView, Pressable, Linking, Image, Switch
} from 'react-native';
import { formatDateBR } from '../../utils/dateUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { ThemeContext } from '../../styles/ThemeContext';
export default function RequestReservationModal({ visible, onClose, initialData, onSuccess, onDelete, isAdmin }) {
  const { theme: activeTheme, appearance } = React.useContext(ThemeContext);
  const isDark = appearance === 'dark';
  const [apartment, setApartment]   = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [guestName, setGuestName]   = useState('');
  const [notes, setNotes]           = useState('');
  const [price, setPrice]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [guests, setGuests]         = useState([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestList, setShowGuestList] = useState(false);
  
  // New Fields: Vehicle and Pet
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [pet, setPet]                   = useState(false);
  
  // Date Picker States
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  // Multi-Apartment State
  const [userApartments, setUserApartments] = useState([]);

  const isEdit = !!initialData;

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setApartment(initialData.apartment || '');
        setStartDate(initialData.startDate || '');
        setEndDate(initialData.endDate || '');
        if (initialData.startDate) setTempStartDate(new Date(initialData.startDate + 'T12:00:00'));
        if (initialData.endDate) setTempEndDate(new Date(initialData.endDate + 'T12:00:00'));
        setGuestName(initialData.guestName || '');
        setGuestSearch(initialData.guestName || '');
        setNotes(initialData.notes || '');
        setPrice(initialData.price ? String(initialData.price) : '');
        setVehicleModel(initialData.vehicleModel || '');
        setVehiclePlate(initialData.vehiclePlate || '');
        setVehicleColor(initialData.vehicleColor || '');
        setPet(!!initialData.pet);
      } else {
        loadOwnerData();
      }
      loadGuests();
    }
  }, [visible, initialData]);

  const loadOwnerData = async () => {
    try {
      const aptsJson = await AsyncStorage.getItem('@user_apartments');
      if (aptsJson) {
        const apts = JSON.parse(aptsJson);
        setUserApartments(apts);
        if (apts.length > 0 && !apartment) {
          setApartment(apts[0]);
        }
      } else {
         const singleApt = await AsyncStorage.getItem('@user_apartment');
         if (singleApt) {
            setUserApartments([singleApt]);
            setApartment(singleApt);
         }
      }
    } catch (e) {
      console.error('Error loading apts', e);
    }
  };

  const loadGuests = async () => {
    try {
      const res = await api.get('/guests');
      setGuests(res.data);
    } catch (e) {
      console.error('Erro ao buscar hóspedes:', e);
    }
  };

  const filteredGuests = guests.filter(g =>
    g.name && g.name.toLowerCase().includes(guestSearch.toLowerCase())
  ).slice(0, 5);

  const selectGuest = (guest) => {
    setGuestName(guest.name);
    setGuestSearch(guest.name);
    // Auto-preencher notas se houver dados úteis (ex: CPF, Telefone)
    if (guest.phone || guest.doc) {
      const extraInfo = `\n---\n👤 Hóspede Histórico:\n${guest.phone ? `📞 ${guest.phone}\n` : ''}${guest.doc ? `🆔 ${guest.docType}: ${guest.doc}` : ''}`;
      if (!notes.includes(guest.name)) {
        setNotes(prev => prev + extraInfo);
      }
    }
    setShowGuestList(false);
    Alert.alert('Hóspede Localizado', `Os dados de ${guest.name} foram recuperados do sistema.`);
  };

  const onDateChange = (event, selectedDate, type) => {
    // No Android com display='spinner', o onChange é chamado a cada scroll.
    // Não fechamos o picker aqui — o usuário confirma pelo botão.
    if (event.type === 'dismissed') return;

    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      if (type === 'start') {
        setStartDate(formatted);
        setTempStartDate(selectedDate);
      } else {
        setEndDate(formatted);
        setTempEndDate(selectedDate);
      }
    }
  };

  const displayDate = (dateStr) => {
    if (!dateStr) return 'Selecionar data';
    return formatDateBR(dateStr);
  };

  const DatePickerModal = ({ visible, value, onChange, onClose, title }) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.calendarOverlay}>
        <View style={[styles.calendarCard, { backgroundColor: activeTheme.colors.surface, borderColor: activeTheme.colors.glassBorder }]}>
          <Text style={[styles.calendarTitle, { color: activeTheme.colors.text }]}>{title}</Text>
          <DateTimePicker
            value={value}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onChange}
            minimumDate={title === 'DATA DE CHECK-OUT' ? tempStartDate : new Date()}
            themeVariant="dark"
            textColor="#ffffff"
          />
          <TouchableOpacity style={styles.calendarDoneBtn} onPress={onClose}>
            <LinearGradient colors={[activeTheme.colors.primary, '#0055ff']} style={styles.calendarDoneGrad}>
              <Text style={styles.calendarDoneText}>CONFIRMAR DATA</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      return Alert.alert('Atenção', 'Informe as datas de entrada e saída.');
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return Alert.alert('Atenção', 'A data de saída deve ser posterior à entrada.');
    }

    setLoading(true);
    try {
      // Logic for owner modification: if editing, reset status to pending-approval 
      // so admin can re-verify dates/prices.
      const newStatus = (!isAdmin && isEdit) ? 'pending-approval' : 
                        (isEdit ? initialData.status : 'pending-approval');

      const payload = {
        id: isEdit ? initialData.id : `res_${Date.now()}`,
        apartment,
        startDate,
        endDate,
        notes,
        price: price ? Number(price) : null,
        status: newStatus,
        guestName,
        vehicleModel,
        vehiclePlate,
        vehicleColor,
        pet,
      };
      await api.post('/reservations', payload);
      
      if (isAdmin) {
        Alert.alert(
          '✅ Sucesso',
          isEdit ? 'Reserva atualizada!' : 'Reserva criada com sucesso!',
          [
            { 
              text: 'OK', 
              onPress: () => { resetForm(); onSuccess(); } 
            },
            {
              text: 'Enviar WhatsApp',
              style: 'default',
              onPress: async () => {
                const msg = `🏨 *CONFIRMAÇÃO DE RESERVA*\n\n*Apto:* ${apartment}\n*Hóspede:* ${guestName}\n*Check-in:* ${formatDateBR(startDate)}\n*Check-out:* ${formatDateBR(endDate)}${price ? `\n*Valor:* R$ ${price}` : ''}\n\n_Obs: ${notes || 'Sem observações.'}_`;
                const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Erro', 'WhatsApp não instalado.');
                }
                resetForm();
                onSuccess();
              }
            }
          ]
        );
      } else {
        Alert.alert('✅ Sucesso', isEdit ? 'Solicitação de alteração enviada!' : 'Solicitação enviada para aprovação!');
        resetForm();
        onSuccess();
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a reserva. Tente novamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    Alert.alert(
      'Confirmar Cancelamento',
      'Deseja realmente cancelar esta reserva? Esta ação notificará o administrador.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const payload = {
                ...initialData,
                status: 'canceled',
                notes: notes + (notes ? '\n' : '') + '[Cancelado pelo Proprietário]'
              };
              await api.post('/reservations', payload);
              Alert.alert('✅ Sucesso', 'Reserva cancelada com sucesso.');
              onSuccess();
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível cancelar a reserva.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setStartDate(''); setEndDate(''); setGuestName('');
    setNotes(''); setPrice(''); setGuestSearch(''); setShowGuestList(false);
    setVehicleModel(''); setVehiclePlate(''); setVehicleColor(''); setPet(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
            style={styles.dismissArea} 
            activeOpacity={1} 
            onPress={() => { resetForm(); onClose(); }} 
        />
        <BlurView  intensity={90} tint="dark" style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          
          <View style={styles.modalHeader}>
            <View>
                <Text style={[styles.modalSub, { color: activeTheme.colors.primary }]}>{isEdit ? 'CONTROLE' : 'RESERVA'}</Text>
                <Text style={[styles.modalTitle, { color: activeTheme.colors.text }]}>{isEdit ? 'Editar Ocupação' : 'Nova Solicitação'}</Text>
            </View>
            <TouchableOpacity onPress={() => { resetForm(); onClose(); }} style={[styles.closeBtn, { backgroundColor: activeTheme.colors.glassSecondary, borderColor: activeTheme.colors.glassBorder }]}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.fieldSection}>
                <Text style={styles.sectionTitle}>SOBRE A UNIDADE</Text>
                <View style={styles.glassContainer}>
                    <View style={styles.field}>
                      <View style={styles.labelRow}>
                        <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                        <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>N° DO APARTAMENTO</Text>
                      </View>
                      {isAdmin ? (
                          <TextInput
                            style={styles.input}
                            placeholder="Ex: 304"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={apartment}
                            onChangeText={setApartment}
                            keyboardType="numeric"
                          />
                      ) : (
                        <View style={styles.aptSelectorRow}>
                          {userApartments.map(apt => (
                            <TouchableOpacity 
                              key={apt}
                              activeOpacity={0.8}
                              onPress={() => setApartment(apt)}
                              style={[styles.aptOption, { backgroundColor: activeTheme.colors.glassSecondary, borderColor: activeTheme.colors.glassBorder }, apartment === apt && { backgroundColor: activeTheme.colors.primary, borderColor: activeTheme.colors.primary }]}
                            >
                              <Text style={[styles.aptOptionText, { color: activeTheme.colors.textTertiary }, apartment === apt && { color: '#fff', fontWeight: '900' }]}>
                                {apt}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                </View>
            </View>

            <View style={styles.fieldSection}>
                <Text style={styles.sectionTitle}>HÓSPEDE PRINCIPAL</Text>
                <View style={styles.glassContainer}>
                    <View style={styles.field}>
                      <View style={styles.labelRow}>
                        <Image source={require('../../../assets/icons/profile_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary}} resizeMode="contain" />
                        <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>NOME DO HÓSPEDE</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { color: activeTheme.colors.text }]}
                        placeholder="Buscar ou cadastrar..."
                        placeholderTextColor={activeTheme.colors.textTertiary}
                        value={guestSearch}
                        onChangeText={(t) => { setGuestSearch(t); setGuestName(t); setShowGuestList(t.length > 0); }}
                      />
                      {showGuestList && filteredGuests.length > 0 && (
                        <View style={styles.autocomplete}>
                          {filteredGuests.map(g => (
                            <TouchableOpacity 
                                key={g.id || g._id} 
                                style={styles.autocompleteItem} 
                                onPress={() => selectGuest(g)}
                            >
                              <View>
                                <Text style={styles.autocompleteText}>{g.name}</Text>
                                {g.doc ? <Text style={styles.autocompleteDoc}>{g.docType}: {g.doc}</Text> : null}
                              </View>
                              <Image source={require('../../../assets/icons/chevron_forward_active.png')} style={{ width: 14, height: 14, opacity: 0.5 }} resizeMode="contain" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                </View>
            </View>

            <View style={styles.fieldSection}>
                <Text style={styles.sectionTitle}>PERÍODO DE ESTADIA</Text>
                <View style={styles.glassContainer}>
                    <View style={styles.dateRow}>
                      <View style={styles.fieldHalf}>
                        <View style={styles.labelRow}>
                            <Image source={require('../../../assets/icons/check_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                            <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>CHECK-IN</Text>
                        </View>
                        <Pressable onPress={() => { setShowStartPicker(true); setShowEndPicker(false); }}>
                          <Text style={[styles.dateDisplayText, { color: activeTheme.colors.text }, !startDate && { color: activeTheme.colors.textTertiary }]}>
                            {displayDate(startDate)}
                          </Text>
                        </Pressable>
                      </View>
                      <View style={styles.vertDivider} />
                      <View style={styles.fieldHalf}>
                        <View style={styles.labelRow}>
                            <Image source={require('../../../assets/icons/arrow_forward_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
                            <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>CHECK-OUT</Text>
                        </View>
                        <Pressable onPress={() => { setShowEndPicker(true); setShowStartPicker(false); }}>
                          <Text style={[styles.dateDisplayText, { color: activeTheme.colors.text }, !endDate && { color: activeTheme.colors.textTertiary }]}>
                            {displayDate(endDate)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <DatePickerModal 
                      visible={showStartPicker}
                      value={tempStartDate}
                      title="DATA DE CHECK-IN"
                      onChange={(e, d) => onDateChange(e, d, 'start')}
                      onClose={() => setShowStartPicker(false)}
                    />

                    <DatePickerModal 
                      visible={showEndPicker}
                      value={tempEndDate}
                      title="DATA DE CHECK-OUT"
                      onChange={(e, d) => onDateChange(e, d, 'end')}
                      onClose={() => setShowEndPicker(false)}
                    />
                </View>
            </View>

            <View style={styles.fieldSection}>
                <Text style={styles.sectionTitle}>VEÍCULO (OPCIONAL)</Text>
                <View style={styles.glassContainer}>
                    <View style={styles.field}>
                      <View style={styles.labelRow}>
                        <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                        <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>PLACA</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { color: activeTheme.colors.text }]}
                        placeholder="Ex: ABC1D23"
                        placeholderTextColor={activeTheme.colors.textTertiary}
                        value={vehiclePlate}
                        onChangeText={setVehiclePlate}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.dividerLarge} />
                    <View style={styles.field}>
                      <View style={styles.labelRow}>
                        <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                        <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>MODELO E COR</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TextInput
                          style={[styles.input, { color: activeTheme.colors.text, flex: 1 }]}
                          placeholder="Modelo"
                          placeholderTextColor={activeTheme.colors.textTertiary}
                          value={vehicleModel}
                          onChangeText={setVehicleModel}
                        />
                        <View style={{ width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        <TextInput
                          style={[styles.input, { color: activeTheme.colors.text, flex: 1 }]}
                          placeholder="Cor"
                          placeholderTextColor={activeTheme.colors.textTertiary}
                          value={vehicleColor}
                          onChangeText={setVehicleColor}
                        />
                      </View>
                    </View>
                </View>
            </View>

            <View style={styles.fieldSection}>
                <Text style={styles.sectionTitle}>OPÇÕES ADICIONAIS</Text>
                <View style={styles.glassContainer}>
                    <View style={[styles.field, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                        <View>
                            <View style={styles.labelRow}>
                                <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                                <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>PERMITIR PETS?</Text>
                            </View>
                            <Text style={{ color: activeTheme.colors.textSecondary, fontSize: 13 }}>{pet ? 'Autorizado' : 'Não autorizado'}</Text>
                        </View>
                        <Switch 
                            value={pet}
                            onValueChange={setPet}
                            trackColor={{ false: 'rgba(255,255,255,0.1)', true: activeTheme.colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>
            </View>

            <View style={styles.fieldSection}>
                <Text style={styles.sectionTitle}>DADOS ADICIONAIS</Text>
                <View style={styles.glassContainer}>
                    <View style={styles.field}>
                      <View style={styles.labelRow}>
                        <Image source={require('../../../assets/icons/stats_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                        <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>VALOR ESTIMADO (OPCIONAL)</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { color: activeTheme.colors.text }]}
                        placeholder="R$ 0,00"
                        placeholderTextColor={activeTheme.colors.textTertiary}
                        value={price}
                        keyboardType="numeric"
                        onChangeText={setPrice}
                      />
                    </View>

                    <View style={styles.dividerLarge} />

                    <View style={styles.field}>
                      <View style={styles.labelRow}>
                        <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                        <Text style={[styles.label, { color: activeTheme.colors.textTertiary }]}>NOTAS EXTRAS</Text>
                      </View>
                      <TextInput
                        style={[styles.input, styles.textArea, { color: activeTheme.colors.text }]}
                        placeholder="Detalhes especiais ou requisitos..."
                        placeholderTextColor={activeTheme.colors.textTertiary}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                      />
                    </View>
                </View>
            </View>

            <View style={[styles.infoBox, { borderColor: activeTheme.colors.primary + '30' }]}>
                <View style={[styles.infoGlow, { backgroundColor: activeTheme.colors.primary }]} />
                <Image source={require('../../../assets/icons/shield_active.png')} style={{ width: 24, height: 24, tintColor: activeTheme.colors.primary }} resizeMode="contain" />
                <View style={{flex: 1}}>
                    <Text style={[styles.infoTitle, { color: activeTheme.colors.text }]}>Solicitação Segura</Text>
                    <Text style={[styles.infoText, { color: activeTheme.colors.textSecondary }]}>
                        {isEdit ? 'Alterações serão revisadas administrativamente.' : 'A aprovação será notificada via dashboard.'}
                    </Text>
                </View>
            </View>

            <TouchableOpacity 
                activeOpacity={0.9}
                style={styles.submitBtn} 
                onPress={handleSubmit} 
                disabled={loading || deleting}
            >
              <LinearGradient 
                colors={[theme.colors.primary, '#0055ff']} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 0}}
                style={styles.submitGrad}
              >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitText}>{isEdit ? 'Salvar Modificações' : 'Confirmar Solicitação'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {isEdit && (
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[isAdmin ? styles.deleteBtn : styles.cancelActionBtn, { borderColor: isAdmin ? activeTheme.colors.error + '30' : activeTheme.colors.warning + '30', backgroundColor: isAdmin ? activeTheme.colors.error + '10' : activeTheme.colors.warning + '10' }]}
                    onPress={isAdmin ? () => {
                        Alert.alert('⚠️ Excluir Permanentemente?', 'Esta ação não poderá ser desfeita no sistema.', [
                            { text: 'Voltar', style: 'cancel' },
                            { 
                                text: 'Confirmar Exclusão', 
                                style: 'destructive',
                                onPress: async () => {
                                    setDeleting(true);
                                    try {
                                        await api.delete(`/reservations/${initialData._id || initialData.id}`);
                                        Alert.alert('✅ Sucesso', 'A reserva foi removida permanentemente.');
                                        onSuccess();
                                    } catch (e) {
                                        Alert.alert('Erro', 'Ocorreu uma falha na exclusão.');
                                    } finally {
                                        setDeleting(false);
                                    }
                                }
                            }
                        ]);
                    } : handleCancelReservation}
                    disabled={loading || deleting}
                >
                    {deleting ? (
                        <ActivityIndicator color={isAdmin ? activeTheme.colors.error : activeTheme.colors.warning} />
                    ) : (
                        <Text style={[isAdmin ? styles.deleteText : styles.cancelActionText, { color: isAdmin ? activeTheme.colors.error : activeTheme.colors.warning }]}>
                            {isAdmin ? 'Excluir Registro de Reserva' : 'Cancelar Estadia'}
                        </Text>
                    )}
                </TouchableOpacity>
            )}
          </ScrollView>
        </BlurView>
</KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  dismissArea: { flex: 1 },
  modalContent: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  dragIndicator: { 
    width: 40, height: 5, borderRadius: 3, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignSelf: 'center', marginBottom: 20 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 30,
  },
  modalTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  modalSub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { 
    width: 44, height: 44, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },

  scrollContent: { paddingBottom: 60 },
  fieldSection: { marginBottom: 24 },
  sectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12, marginLeft: 5 },
  glassContainer: { 
      borderRadius: 24, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.08)', 
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.02)'
  },
  
  field: { padding: 20 },
  fieldHalf: { flex: 1, padding: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  input: { 
    color: '#fff', 
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
    letterSpacing: -0.5
  },
  inputDisabled: { justifyContent: 'center' },
  inputDisabledText: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '700' },
  textArea: { fontSize: 15, fontWeight: '600', height: 100, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  vertDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.05)' },
  dividerLarge: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20 },

  autocomplete: {
    backgroundColor: 'rgba(0,0,0,0.5)', 
    borderRadius: 16, 
    marginTop: 15,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  autocompleteItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  autocompleteText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  autocompleteDoc: { fontSize: 12, marginTop: 4, fontWeight: '600' },

  infoBox: {
    flexDirection: 'row', alignItems: 'center', 
    borderRadius: 24, padding: 20, marginTop: 10, 
    borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.2)',
    gap: 18, overflow: 'hidden'
  },
  infoGlow: {
      position: 'absolute', top: -30, left: -30,
      width: 100, height: 100, borderRadius: 50,
      opacity: 0.1
  },
  infoTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  infoText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 18, marginTop: 2, fontWeight: '600' },

  submitBtn: { 
    marginTop: 35, 
    borderRadius: 20, 
    overflow: 'hidden',
  },
  submitGrad: { height: 68, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },

  deleteBtn: {
      padding: 18,
      alignItems: 'center',
      marginTop: 20,
      borderWidth: 1,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 69, 58, 0.05)',
  },
  deleteText: { fontWeight: '800', fontSize: 14, letterSpacing: -0.2 },
  
  aptSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  aptOption: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  aptOptionActive: { 
  },
  aptOptionText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
  aptOptionTextActive: { color: '#fff', fontWeight: '900' },
  
  dateDisplayText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  calendarCard: { width: '90%', borderRadius: 30, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  calendarTitle: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 20, letterSpacing: 1 },
  calendarDoneBtn: { marginTop: 20, borderRadius: 15, overflow: 'hidden' },
  calendarDoneGrad: { height: 50, justifyContent: 'center', alignItems: 'center' },
  calendarDoneText: { color: '#fff', fontWeight: '900' },
  cancelActionBtn: {
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 159, 10, 0.05)',
  },
  cancelActionText: { fontWeight: '800', fontSize: 14, letterSpacing: -0.2 },
});
