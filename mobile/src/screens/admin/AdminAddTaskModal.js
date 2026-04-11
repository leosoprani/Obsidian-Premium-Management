import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Dimensions, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { theme } from '../../styles/theme';

const { height } = Dimensions.get('window');

const TASK_TYPES = [
  { id: 'cleaning', label: 'Limpeza', icon: require('../../assets/icons/cleaning_active.png'), inactive: require('../../assets/icons/cleaning_inactive.png'), color: theme.colors.secondary },
  { id: 'maintenance', label: 'Manutenção', icon: require('../../assets/icons/maintenance_active.png'), inactive: require('../../assets/icons/maintenance_inactive.png'), color: theme.colors.primary },
  { id: 'blocked', label: 'Bloqueio', icon: require('../../assets/icons/stop_active.png'), inactive: require('../../assets/icons/stop_inactive.png'), color: theme.colors.error },
];

export default function AdminAddTaskModal({ visible, onClose, onRefresh, initialData }) {
  const [type, setType] = useState('cleaning');
  const [apartment, setApartment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Especificos por tipo
  const [provider, setProvider] = useState(''); // Limpeza
  const [serviceType, setServiceType] = useState(''); // Manutenção
  const [company, setCompany] = useState(''); // Manutenção
  const [reason, setReason] = useState(''); // Bloqueio

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initialData;

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setType(initialData.status || 'cleaning');
        setApartment(String(initialData.apartment) || '');
        setStartDate(initialData.checkin || '');
        setEndDate(initialData.checkout || '');
        setStartTime(initialData.checkinTime || '');
        setEndTime(initialData.checkoutTime || '');
        
        if (initialData.status === 'cleaning' && initialData.notes?.startsWith('Prestador: ')) {
          setProvider(initialData.notes.replace('Prestador: ', ''));
        } else if (initialData.status === 'maintenance') {
            // No web não há campos separados no DB, mas podemos tentar parsear se houver padrão
            setServiceType(initialData.description || '');
        } else if (initialData.status === 'blocked') {
            setReason(initialData.notes || '');
        }
      } else {
        const today = new Date().toISOString().split('T')[0];
        setType('cleaning'); setApartment(''); setStartDate(today); setEndDate(today);
        setStartTime(''); setEndTime(''); setProvider(''); setServiceType('');
        setCompany(''); setReason('');
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!apartment || !startDate || !endDate) {
      return Alert.alert('Atenção', 'Apartamento e datas são obrigatórios.');
    }

    setLoading(true);
    try {
      let notes = '';
      let description = '';

      if (type === 'cleaning') {
        notes = provider ? `Prestador: ${provider}` : '';
        description = 'Limpeza agendada';
      } else if (type === 'maintenance') {
        notes = company ? `Empresa: ${company}` : '';
        description = serviceType || 'Manutenção';
      } else if (type === 'blocked') {
        notes = reason;
        description = 'Apartamento Bloqueado';
      }

      const payload = {
        id: isEdit ? initialData.id : null,
        guestId: 'TASK',
        apartment,
        checkin: startDate,
        checkout: endDate,
        checkinTime: startTime,
        checkoutTime: endTime,
        status: type,
        notes,
        description
      };

      await api.post('/tasks', payload);

      Alert.alert('✅ Sucesso', isEdit ? 'Tarefa atualizada.' : 'Tarefa registrada com sucesso.');
      onRefresh && onRefresh();
      onClose();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a tarefa.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('⚠️ Excluir Tarefa', 'Tem certeza que deseja remover este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive', 
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/reservations/${initialData.id}`); // Tarefas são reservas com guestId=TASK
            Alert.alert('✅ Sucesso', 'Tarefa removida.');
            onRefresh && onRefresh();
            onClose();
          } catch(e) {
            Alert.alert('Erro', 'Não foi possível excluir.');
          } finally {
            setDeleting(false);
          }
        }
      }
    ]);
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
            onPress={onClose} 
        />
        <BlurView intensity={95} tint="dark" style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          
          <View style={styles.modalHeader}>
            <View>
                <Text style={styles.modalSub}>{type.toUpperCase()}</Text>
                <Text style={styles.modalTitle}>{isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Image source={require('../../assets/icons/stop_active.png')} style={{ width: 22, height: 22, opacity: 0.5 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.field}>
              <Text style={styles.label}>TIPO DE OPERAÇÃO</Text>
              <View style={styles.typeSelector}>
                {TASK_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    activeOpacity={0.8}
                    style={[
                        styles.typeBtn, 
                        type === t.id && { borderColor: t.color, backgroundColor: `${t.color}15` }
                    ]}
                    onPress={() => setType(t.id)}
                  >
                    <Image 
                        source={type === t.id ? t.icon : t.inactive} 
                        style={{ width: 20, height: 20 }} 
                        resizeMode="contain"
                    />
                    <Text style={[
                        styles.typeText, 
                        type === t.id && { color: t.color, fontWeight: '800' }
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>APARTAMENTO</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 304"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="numeric"
                  value={apartment}
                  onChangeText={setApartment}
                />
              </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>DATA INÍCIO</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="AAAA-MM-DD"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={startDate}
                            onChangeText={setStartDate}
                        />
                    </View>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>DATA FIM</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="AAAA-MM-DD"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={endDate}
                            onChangeText={setEndDate}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>HORA INÍCIO</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="00:00"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={startTime}
                            onChangeText={setStartTime}
                        />
                    </View>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>HORA FIM</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="00:00"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={endTime}
                            onChangeText={setEndTime}
                        />
                    </View>
                </View>
            </View>

            {type === 'cleaning' && (
              <View style={styles.field}>
                <Text style={styles.label}>PRESTADOR (OPCIONAL)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome da pessoa/limpeza"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={provider}
                    onChangeText={setProvider}
                  />
                </View>
              </View>
            )}

            {type === 'maintenance' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>TIPO DE SERVIÇO</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Conserto Ar Condicionado"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={serviceType}
                      onChangeText={setServiceType}
                    />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>EMPRESA / RESPONSÁVEL</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: EletroFrio"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={company}
                      onChangeText={setCompany}
                    />
                  </View>
                </View>
              </>
            )}

            {type === 'blocked' && (
              <View style={styles.field}>
                <Text style={styles.label}>MOTIVO DO BLOQUEIO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 15 }]}
                    placeholder="Ex: Reforma ou indisponibilidade"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    multiline
                    value={reason}
                    onChangeText={setReason}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity 
                activeOpacity={0.9}
                style={styles.saveBtn} 
                onPress={handleSave} 
                disabled={loading}
            >
              <LinearGradient 
                colors={[theme.colors.primary, '#0055ff']} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 0}}
                style={styles.saveGrad}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Salvar Tarefa</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {isEdit && (
                <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={handleDelete}
                    disabled={deleting}
                >
                    {deleting ? <ActivityIndicator color={theme.colors.error} /> : <Text style={styles.deleteTxt}>Excluir Registro</Text>}
                </TouchableOpacity>
            )}
          </ScrollView>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  modalContent: {
    backgroundColor: 'rgba(15, 15, 15, 0.98)',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)'
  },
  dragIndicator: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  modalSub: { color: theme.colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingBottom: 50 },
  field: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  
  typeSelector: { flexDirection: 'row', gap: 10 },
  typeBtn: { 
      flex: 1, 
      height: 64, 
      borderRadius: 16, 
      backgroundColor: 'rgba(255,255,255,0.04)', 
      justifyContent: 'center', 
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      gap: 4
  },
  typeText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },

  inputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  input: { height: 52, paddingHorizontal: 16, color: '#fff', fontSize: 15, fontWeight: '600' },

  saveBtn: { marginTop: 15, borderRadius: 18, overflow: 'hidden' },
  saveGrad: { height: 62, justifyContent: 'center', alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  
  deleteBtn: { marginTop: 15, height: 56, borderRadius: 18, borderWith: 1, borderColor: 'rgba(255,69,58,0.2)', backgroundColor: 'rgba(255,69,58,0.05)', justifyContent: 'center', alignItems: 'center' },
  deleteTxt: { color: theme.colors.error, fontWeight: '700', fontSize: 14 }
});
