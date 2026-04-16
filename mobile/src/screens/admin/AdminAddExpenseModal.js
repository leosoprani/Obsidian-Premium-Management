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

export default function AdminAddExpenseModal({ visible, onClose, onRefresh }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('maintenance'); // maintenance | cleaning | utilities | other
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: 'maintenance', label: 'Manutenção', icon: require('../../../assets/icons/maintenance_active.png'), inactive: require('../../../assets/icons/maintenance_inactive.png'), color: theme.colors.primary },
    { id: 'cleaning', label: 'Limpeza', icon: require('../../../assets/icons/cleaning_active.png'), inactive: require('../../../assets/icons/cleaning_inactive.png'), color: theme.colors.secondary },
    { id: 'utilities', label: 'Contas', icon: require('../../../assets/icons/stats_active.png'), inactive: require('../../../assets/icons/stats_inactive.png'), color: theme.colors.warning },
    { id: 'other', label: 'Outros', icon: require('../../../assets/icons/dots_active.png'), inactive: require('../../../assets/icons/dots_inactive.png'), color: theme.colors.textTertiary },
  ];

  const handleSave = async () => {
    if (!description || !amount) {
      return Alert.alert('Atenção', 'Descrição e valor são obrigatórios.');
    }

    setLoading(true);
    try {
      await api.post('/expenses', {
        description,
        amount: parseFloat(amount.replace(',', '.')),
        category,
        date,
      });

      Alert.alert('✅ Sucesso', 'Despesa registrada com sucesso.');
      onRefresh && onRefresh();
      onClose();
      setDescription('');
      setAmount('');
      setCategory('maintenance');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a despesa.');
    } finally {
      setLoading(false);
    }
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
        <BlurView  intensity={90} tint="dark" style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          <View style={styles.modalHeader}>
            <View>
                <Text style={styles.modalSub}>FINANCEIRO</Text>
                <Text style={styles.modalTitle}>Nova Despesa</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.field}>
              <Text style={styles.label}>CATEGORIA</Text>
              <View style={styles.categoryGrid}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.8}
                    style={[
                        styles.categoryBtn, 
                        category === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}15` }
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Image 
                        source={category === cat.id ? cat.icon : cat.inactive} 
                        style={{ width: 22, height: 22 }} 
                        resizeMode="contain"
                    />
                    <Text style={[
                        styles.categoryText, 
                        category === cat.id && { color: cat.color, fontWeight: '800' }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>DESCRIÇÃO DO GASTO</Text>
              <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Troca de lâmpadas Apto 003"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={description}
                    onChangeText={setDescription}
                  />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>VALOR (R$)</Text>
              <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    placeholder="0,00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
              </View>
            </View>

            <TouchableOpacity 
                activeOpacity={0.9}
                style={styles.saveBtn} 
                onPress={handleSave} 
                disabled={loading}
            >
              <LinearGradient 
                colors={[theme.colors.error, '#ff4b2b']} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 0}}
                style={styles.saveGrad}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Registrar Gasto</Text>}
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
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)'
  },
  dragIndicator: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  modalSub: { color: theme.colors.error, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  closeBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingBottom: 40 },
  field: { marginBottom: 25 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
  
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryBtn: { 
      flex: 1, 
      minWidth: '45%', 
      height: 80, 
      borderRadius: 20, 
      backgroundColor: 'rgba(255,255,255,0.03)', 
      justifyContent: 'center', 
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      gap: 8
  },
  categoryText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },

  inputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  input: { height: 60, paddingHorizontal: 20, color: '#fff', fontSize: 16, fontWeight: '600' },
  amountInput: { fontSize: 24, fontWeight: '800', color: theme.colors.error },

  saveBtn: { marginTop: 10, borderRadius: 20, overflow: 'hidden' },
  saveGrad: { height: 68, justifyContent: 'center', alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 18, fontWeight: '900' }
});
