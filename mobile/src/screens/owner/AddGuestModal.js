import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, Alert, ActivityIndicator, Platform,
  KeyboardAvoidingView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { theme } from '../../styles/theme';

export default function AddGuestModal({ visible, onClose, onSuccess }) {
  const [name, setName]         = useState('');
  const [doc, setDoc]           = useState('');
  const [docType, setDocType]   = useState('CPF');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [photo, setPhoto]       = useState(null);

  const docTypes = ['CPF', 'RG', 'Passaporte', 'CNH'];

  const resetForm = () => {
    setName(''); setDoc(''); setDocType('CPF');
    setPhone(''); setEmail(''); setNotes('');
    setPhoto(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert('Campo obrigatório', 'Informe o nome do hóspede.');
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        doc: doc.trim(),
        docType,
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        notes: notes.trim(),
        photo: photo,
      };
      await api.post('/guests', payload);
      resetForm();
      onSuccess();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o hóspede. Verifique os dados e tente novamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (useCamera = false) => {
    const { status } = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync() 
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      return Alert.alert('Permissão negada', 'Precisamos de acesso para prosseguir.');
    }

    let result;
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
    }

    if (!result.canceled) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert(
      'Foto do Hóspede',
      'Como deseja capturar a foto?',
      [
        { text: 'Câmera', onPress: () => pickImage(true) },
        { text: 'Galeria', onPress: () => pickImage(false) },
        { text: 'Remover', style: 'destructive', onPress: () => setPhoto(null) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
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
            onPress={() => { resetForm(); onClose(); }} 
        />
        <BlurView 
          intensity={Platform.OS === 'ios' ? 80 : 100} 
          tint="dark" 
          style={[styles.modalContent, Platform.OS === 'android' && { backgroundColor: 'rgba(10, 10, 12, 0.98)' }]}
        >
          <View style={styles.modalHeader}>
            <View>
                <Text style={styles.modalTitle}>Novo Hóspede</Text>
                <Text style={styles.modalSub}>CADASTRO DE CLIENTE</Text>
            </View>
            <TouchableOpacity onPress={() => { resetForm(); onClose(); }} style={styles.closeBtn}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.photoContainer}>
              <TouchableOpacity activeOpacity={0.8} onPress={handlePhotoOptions} style={styles.photoFrame}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Image source={require('../../../assets/icons/attachment_inactive.png')} style={{ width: 32, height: 32, opacity: 0.5 }} resizeMode="contain" />
                    <Text style={styles.photoPlaceholderText}>ADICIONAR FOTO</Text>
                  </View>
                )}
                <View style={styles.photoEditBadge}>
                  <Image source={photo ? require('../../../assets/icons/check_white.png') : require('../../../assets/icons/add_white.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>NOME COMPLETO *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João Silva"
                placeholderTextColor={theme.colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>TIPO DE DOCUMENTO</Text>
              <View style={styles.docTypeRow}>
                {docTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    style={[styles.docTypeBtn, docType === type && styles.docTypeBtnActive]}
                    onPress={() => setDocType(type)}
                  >
                    <Text style={[styles.docTypeText, docType === type && styles.docTypeTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>NÚMERO DO DOCUMENTO</Text>
              <TextInput
                style={styles.input}
                placeholder={`Inserir ${docType}`}
                placeholderTextColor={theme.colors.textTertiary}
                value={doc}
                onChangeText={setDoc}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>WHATSAPP / TELEFONE</Text>
              <TextInput
                style={styles.input}
                placeholder="(83) 99999-9999"
                placeholderTextColor={theme.colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>E-MAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="email@exemplo.com"
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>OBSERVAÇÕES</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Informações relevantes (alergias, pedidos...)"
                placeholderTextColor={theme.colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity 
                activeOpacity={0.9}
                style={styles.submitBtn} 
                onPress={handleSave} 
                disabled={loading}
            >
              <LinearGradient 
                colors={[theme.colors.secondary, '#15803d']} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 0}}
                style={styles.submitGrad}
              >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitText}>Salvar Hóspede</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
  modalSub: { color: theme.colors.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
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
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 15 },

  docTypeRow: { flexDirection: 'row', gap: 8 },
  docTypeBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  docTypeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  docTypeText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 13 },
  docTypeTextActive: { color: '#fff', fontWeight: '800' },

  submitBtn: { 
    marginTop: theme.spacing.md, 
    borderRadius: theme.borderRadius.lg, 
    overflow: 'hidden',
  },
  submitGrad: { height: 60, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  photoContainer: { alignItems: 'center', marginBottom: 30 },
  photoFrame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'visible'
  },
  photo: { width: 116, height: 116, borderRadius: 58 },
  photoPlaceholder: { alignItems: 'center' },
  photoPlaceholderText: { color: theme.colors.textTertiary, fontSize: 10, fontWeight: '800', marginTop: 8 },
  photoEditBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.8)'
  }
});
