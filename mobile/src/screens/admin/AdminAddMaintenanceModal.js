import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { theme } from '../../styles/theme';

export default function AdminAddMaintenanceModal({ visible, onClose, onRefresh, initialData }) {
  const [apartment, setApartment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initialData;

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setApartment(String(initialData.apartment) || '');
        setStartDate(initialData.checkin || '');
        setEndDate(initialData.checkout || '');
        setServiceType(initialData.description || '');
        setCompany(initialData.notes?.replace('Empresa: ', '') || '');
      } else {
        const today = new Date().toISOString().split('T')[0];
        setApartment(''); setStartDate(today); setEndDate(today);
        setServiceType(''); setCompany('');
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!apartment || !startDate || !serviceType) {
      return Alert.alert('Atenção', 'Apartamento, data e tipo de serviço são obrigatórios.');
    }

    setLoading(true);
    try {
      const payload = {
        id: isEdit ? initialData.id : null,
        guestId: 'TASK',
        apartment,
        checkin: startDate,
        checkout: endDate,
        status: 'maintenance',
        notes: company ? `Empresa: ${company}` : '',
        description: serviceType
      };

      await api.post('/tasks', payload);
      Alert.alert('✅ Sucesso', isEdit ? 'Manutenção atualizada.' : 'Manutenção agendada com sucesso.');
      onRefresh && onRefresh();
      onClose();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a manutenção.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('⚠️ Excluir Manutenção', 'Deseja remover este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive', 
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/reservations/${initialData.id}`);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        <BlurView intensity={90} tint="dark" style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSub}>OPERAÇÕES</Text>
              <Text style={styles.modalTitle}>{isEdit ? 'Editar Manutenção' : 'Novo Reparo'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Image source={require('../../assets/icons/stop_active.png')} style={{ width: 22, height: 22, opacity: 0.5 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.field}>
              <Text style={styles.label}>APARTAMENTO</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ex: 202" keyboardType="numeric" value={apartment} onChangeText={setApartment} placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>TIPO DE SERVIÇO</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ex: Conserto de Ar Condicionado" value={serviceType} onChangeText={setServiceType} placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>DATA INÍCIO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
                </View>
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>DATA FIM</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="AAAA-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>EMPRESA / RESPONSÁVEL</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ex: EletroFrio" value={company} onChangeText={setCompany} placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.9} style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              <LinearGradient colors={[theme.colors.primary, '#0055ff']} style={styles.saveGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Salvar Manutenção</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
                <Text style={styles.deleteTxt}>Excluir Registro</Text>
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
  modalContent: { backgroundColor: 'rgba(15, 15, 15, 0.98)', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 24, maxHeight: '85%', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  dragIndicator: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  modalSub: { color: theme.colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  field: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', marginBottom: 10 },
  inputWrapper: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { height: 52, paddingHorizontal: 16, color: '#fff', fontSize: 15, fontWeight: '600' },
  saveBtn: { marginTop: 15, borderRadius: 18, overflow: 'hidden' },
  saveGrad: { height: 62, justifyContent: 'center', alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  deleteBtn: { marginTop: 15, height: 50, justifyContent: 'center', alignItems: 'center' },
  deleteTxt: { color: theme.colors.error, fontWeight: '700' }
});
