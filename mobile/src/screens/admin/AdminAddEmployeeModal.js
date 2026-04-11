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

export default function AdminAddEmployeeModal({ visible, onClose, onRefresh, initialData }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [doc, setDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initialData;

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name || '');
        setRole(initialData.role || '');
        setDoc(initialData.doc || '');
      } else {
        setName(''); setRole(''); setDoc('');
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!name || !role) {
      return Alert.alert('Atenção', 'Nome e Cargo são obrigatórios.');
    }

    setLoading(true);
    try {
      const payload = {
        id: isEdit ? initialData.id : `emp_${Date.now()}`,
        name,
        role,
        doc
      };

      await api.post('/employees', payload);
      Alert.alert('✅ Sucesso', isEdit ? 'Funcionário atualizado.' : 'Funcionário cadastrado com sucesso.');
      onRefresh && onRefresh();
      onClose();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o funcionário.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('⚠️ Excluir Funcionário', 'Deseja remover este colaborador permanentemente?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive', 
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/employees/${initialData.id}`);
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
              <Text style={styles.modalSub}>RECURSOS HUMANOS</Text>
              <Text style={styles.modalTitle}>{isEdit ? 'Editar Colaborador' : 'Novo Funcionário'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Image source={require('../../assets/icons/stop_active.png')} style={{ width: 22, height: 22, opacity: 0.5 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.field}>
              <Text style={styles.label}>NOME COMPLETO</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ex: João da Silva" value={name} onChangeText={setName} placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>CARGO / FUNÇÃO</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ex: Faxineiro, Eletricista" value={role} onChangeText={setRole} placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>DOCUMENTO (OPCIONAL)</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="CPF ou RG" value={doc} onChangeText={setDoc} placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.9} style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              <LinearGradient colors={[theme.colors.secondary, '#1ea345']} style={styles.saveGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Salvar Funcionário</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
                <Text style={styles.deleteTxt}>Remover Colaborador</Text>
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
  modalSub: { color: theme.colors.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  field: { marginBottom: 20 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', marginBottom: 10 },
  inputWrapper: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { height: 52, paddingHorizontal: 16, color: '#fff', fontSize: 15, fontWeight: '600' },
  saveBtn: { marginTop: 15, borderRadius: 18, overflow: 'hidden' },
  saveGrad: { height: 62, justifyContent: 'center', alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  deleteBtn: { marginTop: 15, height: 50, justifyContent: 'center', alignItems: 'center' },
  deleteTxt: { color: theme.colors.error, fontWeight: '700' }
});
