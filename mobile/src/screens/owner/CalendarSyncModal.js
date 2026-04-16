import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, Image
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';

export default function CalendarSyncModal({ visible, onClose, apartments = [] }) {
  const [calendars, setCalendars] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/me');

      // Dynamic apartment list discovery
      const serverApts = res.data.apartments || (res.data.apartment ? [res.data.apartment] : []);
      const activeApts = apartments.length > 0 ? apartments : serverApts;

      if (res.data && res.data.externalCalendars) {
        setCalendars(res.data.externalCalendars);
      } else {
        const initial = {};
        activeApts.forEach(apt => {
          initial[apt] = { airbnb: '', booking: '' };
        });
        setCalendars(initial);
      }

      // If we found apartments on server but prop was empty, we can still show them by updating state
      // but 'apartments' prop is used for mapping. Let's make it work with what we have.
    } catch (e) {
      console.error('Error loading calendar settings', e);
      const initial = {};
      apartments.forEach(apt => {
        initial[apt] = { airbnb: '', booking: '' };
      });
      setCalendars(initial);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/users/calendars', { calendars });
      Alert.alert('Sucesso', 'Configurações de calendário salvas!');
      onClose();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const updateLink = (apt, platform, link) => {
    setCalendars(prev => ({
      ...prev,
      [apt]: {
        ...(prev[apt] || {}),
        [platform]: link
      }
    }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.container, { backgroundColor: 'rgba(5, 10, 20, 0.98)' }]}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>CONFIGURAÇÃO</Text>
            <Text style={styles.headerTitle}>Sincronização</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>✕</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.desc}>
              Insira os links iCal do Airbnb ou Booking para cada apartamento para sincronizar as datas automaticamente.
            </Text>

            {apartments.map(apt => (
              <View key={apt} style={styles.aptGroup}>
                <Text style={styles.aptLabel}>Apartamento {apt}</Text>
                <View style={styles.inputCard}>
                  <View style={styles.inputRow}>
                    <Image source={require('../../../assets/icons/reservations_active.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    <TextInput
                      style={styles.input}
                      placeholder="Link iCal Airbnb"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={calendars[apt]?.airbnb || ''}
                      onChangeText={(val) => updateLink(apt, 'airbnb', val)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      multiline={false}
                      returnKeyType="done"
                      underlineColorAndroid="transparent"
                    />
                    {(calendars[apt]?.airbnb?.length > 0) && (
                      <TouchableOpacity
                        onPress={() => updateLink(apt, 'airbnb', '')}
                        style={styles.clearBtn}
                      >
                        <Image source={require('../../../assets/icons/stop_inactive.png')} style={{ width: 18, height: 18, opacity: 0.3 }} resizeMode="contain" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.inputRow}>
                    <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    <TextInput
                      style={styles.input}
                      placeholder="Link iCal Booking.com"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={calendars[apt]?.booking || ''}
                      onChangeText={(val) => updateLink(apt, 'booking', val)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      multiline={false}
                      returnKeyType="done"
                      underlineColorAndroid="transparent"
                    />
                    {(calendars[apt]?.booking?.length > 0) && (
                      <TouchableOpacity
                        onPress={() => updateLink(apt, 'booking', '')}
                        style={styles.clearBtn}
                      >
                        <Image source={require('../../../assets/icons/stop_inactive.png')} style={{ width: 18, height: 18, opacity: 0.3 }} resizeMode="contain" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving || loading}
          >
            <LinearGradient colors={[theme.colors.primary, '#0055ff']} style={styles.saveGrad}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar Configurações</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 20
  },
  headerSub: { color: theme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: '900' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 25 },
  desc: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, marginBottom: 30, fontWeight: '500' },
  aptGroup: { marginBottom: 30 },
  aptLabel: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 15 },
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 15,
    fontSize: 14,
    height: 60, // Match row height exactly
    paddingVertical: 0, // Reset for better click area
    marginVertical: 0
  },
  clearBtn: {
    padding: 10,
    marginRight: -10
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  footer: { padding: 25, paddingBottom: 40 },
  saveBtn: { borderRadius: 20, overflow: 'hidden' },
  saveGrad: { height: 60, justifyContent: 'center', alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
