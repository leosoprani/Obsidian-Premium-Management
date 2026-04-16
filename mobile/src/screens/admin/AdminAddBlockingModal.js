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

export default function AdminAddBlockingModal({ visible, onClose, onRefresh, initialData }) {
  const [apartment, setApartment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initialData;

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setApartment(String(initialData.apartment) || '');
        setStartDate(initialData.checkin || '');
        setEndDate(initialData.checkout || '');
        setReason(initialData.notes || '');
      } else {
        const today = new Date().toISOString().split('T')[0];
        setApartment(''); setStartDate(today); setEndDate(today);
        setReason('');
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!apartment || !startDate || !endDate) {
      return Alert.alert('Atenção', 'Apartamento e datas são obrigatórios.');
    }

    setLoading(true);
    try {
      const payload = {
        id: isEdit ? initialData.id : null,
        guestId: 'TASK',
        apartment,
        checkin: startDate,
        checkout: endDate,
        status: 'blocked',
        notes: reason || 'Bloqueio administrativo',
        description: 'Apartamento Bloqueado'
      };

      await api.post('/tasks', payload);
      Alert.alert('✅ Sucesso', isEdit ? 'Bloqueio atualizado.' : 'Apartamento bloqueado com sucesso.');
      onRefresh && onRefresh();
      onClose();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o bloqueio.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('⚠️ Remover Bloqueio', 'Deseja desbloquear este apartamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Desbloquear', 
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
        <BlurView  intensity={90} tint="dark" style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSub}>RESERVAS</Text>
              <Text style={styles.modalTitle}>{isEdit ? 'Editar Bloqueio' : 'Bloquear Apto'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.field}>
              <Text style={styles.label}>APARTAMENTO</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ex: 504" keyboardType="numeric" value={apartment} onChangeText={setApartment} placeholderTextColor="rgba(255,255,255,0.2)" />
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
              <Text style={styles.label}>MOTIVO DO BLOQUEIO</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 15 }]} placeholder="Ex: Reforma no banheiro ou pintura" multiline value={reason} onChangeText={setReason} placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.9} style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              <LinearGradient colors={[theme.colors.error, '#ff4b2b']} style={styles.saveGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Bloquear Apartamento</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
                <Text style={styles.deleteTxt}>Remover Bloqueio</Text>
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
  modalSub: { color: theme.colors.error, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
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
