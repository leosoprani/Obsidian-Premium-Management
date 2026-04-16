import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { theme } from '../../styles/theme';

export default function AdminAddUserModal({ visible, onClose, onRefresh, initialData }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('owner');
  const [apartments, setApartments] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initialData;

  React.useEffect(() => {
    if (visible) {
      if (initialData) {
        setUsername(initialData.username || '');
        setRole(initialData.role || 'owner');
        const apts = Array.isArray(initialData.apartments) ? initialData.apartments.join(', ') : (initialData.apartment || '');
        setApartments(apts);
        setPassword(''); // Reset password field during edit
      } else {
        setUsername(''); setPassword(''); setApartments(''); setRole('owner');
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!username || (!isEdit && !password)) {
      return Alert.alert('Atenção', 'Nome de usuário e senha são obrigatórios.');
    }

    setLoading(true);
    try {
      const aptArray = apartments.split(',').map(a => a.trim()).filter(a => a !== '');
      const payload = {
        username,
        role,
        apartments: aptArray
      };
      if (password) payload.password = password;

      if (isEdit) {
        await api.put(`/users/${initialData._id || initialData.id}`, payload);
      } else {
        await api.post('/users', payload);
      }

      Alert.alert('✅ Sucesso', isEdit ? 'Usuário atualizado.' : `Usuário "${username}" cadastrado.`);
      onRefresh();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.message || 'Erro ao salvar usuário';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('⚠️ Excluir Usuário', `Tem certeza que deseja remover "${username}" permanentemente?`, [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive', 
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/users/${initialData._id || initialData.id}`);
            Alert.alert('✅ Sucesso', 'Usuário removido.');
            onRefresh();
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
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
            style={styles.dismissArea} 
            activeOpacity={1} 
            onPress={onClose} 
        />
        <BlurView  intensity={80} tint="dark" style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
                <Text style={styles.modalTitle}>Novo Acesso</Text>
                <Text style={styles.modalSub}>CADASTRO DE USUÁRIO</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.field}>
              <Text style={styles.label}>NOME DE USUÁRIO</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: joaosilva"
                placeholderTextColor={theme.colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>SENHA INICIAL</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 4 caracteres"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>FUNÇÃO NO SISTEMA</Text>
              <View style={styles.rolePicker}>
                {[
                    { id: 'owner', label: 'Dono' }, 
                    { id: 'staff', label: 'Equipe' }, 
                    { id: 'admin', label: 'Admin' }
                ].map(r => (
                  <TouchableOpacity
                    key={r.id}
                    activeOpacity={0.8}
                    style={[styles.roleBtn, role === r.id && styles.roleBtnActive]}
                    onPress={() => setRole(r.id)}
                  >
                    <Text style={[styles.roleBtnText, role === r.id && styles.roleBtnTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {role === 'owner' && (
              <View style={styles.field}>
                <Text style={styles.label}>APARTAMENTOS VINCULADOS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 101, 202, 303"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={apartments}
                  onChangeText={setApartments}
                />
                <Text style={styles.hint}>Separe múltiplos números por vírgula.</Text>
              </View>
            )}

            <TouchableOpacity 
                activeOpacity={0.9}
                style={styles.saveBtn} 
                onPress={handleSave} 
                disabled={loading || deleting}
            >
              <LinearGradient 
                colors={[theme.colors.primary, '#0055ff']} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 0}}
                style={styles.saveGrad}
              >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveTxt}>{isEdit ? 'Atualizar Dados' : 'Criar Usuário'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {isEdit && (
                <TouchableOpacity 
                    activeOpacity={0.7}
                    style={styles.deleteBtn} 
                    onPress={handleDelete}
                    disabled={loading || deleting}
                >
                    {deleting ? (
                        <ActivityIndicator color={theme.colors.error} />
                    ) : (
                        <>
                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>✕</Text>
                            <Text style={styles.deleteBtnTxt}>Excluir Acesso</Text>
                        </>
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    padding: theme.spacing.lg,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)'
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm
  },
  modalTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  modalSub: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  closeBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: theme.colors.surfaceVariant, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  scrollContent: { paddingBottom: 40 },
  field: { marginBottom: theme.spacing.lg },
  label: { color: theme.colors.textTertiary, fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 1 },
  input: { 
    backgroundColor: theme.colors.surfaceVariant, 
    borderRadius: theme.borderRadius.lg, 
    height: 56, 
    color: theme.colors.text, 
    paddingHorizontal: theme.spacing.lg, 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    fontSize: 16,
    fontWeight: '500'
  },
  hint: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 8, fontStyle: 'italic', marginLeft: 4 },

  rolePicker: { flexDirection: 'row', gap: 10 },
  roleBtn: { 
    flex: 1, 
    height: 48, 
    borderRadius: theme.borderRadius.md, 
    backgroundColor: theme.colors.surfaceVariant, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  roleBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  roleBtnText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  roleBtnTextActive: { color: '#fff', fontWeight: '800' },

  saveBtn: { 
    marginTop: theme.spacing.md, 
    borderRadius: theme.borderRadius.lg, 
    overflow: 'hidden',
  },
  saveGrad: { height: 60, justifyContent: 'center', alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },

  deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      gap: 10,
      padding: 15,
      borderWidth: 1,
      borderColor: 'rgba(255, 69, 58, 0.1)',
      borderRadius: theme.borderRadius.lg,
      backgroundColor: 'rgba(255, 69, 58, 0.05)'
  },
  deleteBtnTxt: { color: theme.colors.error, fontSize: 14, fontWeight: '700' }
});
