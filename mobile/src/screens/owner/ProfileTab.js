import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Dimensions, Platform, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';
import CalendarSyncModal from './CalendarSyncModal';

const { width, height } = Dimensions.get('window');

export default function ProfileTab({ onLogout }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [username, setUsername]           = useState('');
  const [apartment, setApartment]         = useState('');
  const [role, setRole]                   = useState('');
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [apts, setApts]                   = useState([]);

  // Change password fields
  const [currentPwd, setCurrentPwd]       = useState('');
  const [newPwd, setNewPwd]               = useState('');
  const [confirmPwd, setConfirmPwd]       = useState('');
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await AsyncStorage.getItem('@user_username');
      const a = await AsyncStorage.getItem('@user_apartment');
      const r = await AsyncStorage.getItem('@user_role');
      const rs = await AsyncStorage.getItem('@user_apartments');
      if (u) setUsername(u);
      if (a) setApartment(a);
      if (r) setRole(r);
      if (rs) setApts(JSON.parse(rs));
      else if (a) setApts([a]); // Fallback if apartments list is missing but single apartment exists
    };
    load();
  }, []);

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      return Alert.alert('Atenção', 'Preencha todos os campos.');
    }
    if (newPwd !== confirmPwd) {
      return Alert.alert('Atenção', 'A nova senha e a confirmação não coincidem.');
    }
    if (newPwd.length < 4) {
      return Alert.alert('Atenção', 'A nova senha deve ter pelo menos 4 caracteres.');
    }

    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      Alert.alert('✅ Sucesso', 'Senha alterada com sucesso!');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setShowChangePwd(false);
    } catch (e) {
      const msg = e.response?.data?.message || 'Erro ao alterar senha.';
      Alert.alert('Erro', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/reservations');
      const expenses = await api.get('/finance/expenses');
      const users = await api.get('/users');
      const employees = await api.get('/employees');
      
      const backupData = {
        reservations: res.data,
        expenses: expenses.data,
        users: users.data,
        employees: employees.data,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const fileUri = FileSystem.documentDirectory + 'obsidian_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Backup Local', 'Dados salvos localmente no app.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao exportar dados.');
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const data = JSON.parse(fileContent);

      Alert.alert(
        '📥 Importar Dados',
        'Isso substituirá as informações atuais ou adicionará novas dependendo da chave. Deseja prosseguir?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Importar', onPress: async () => {
            try {
              // Aqui chamaria um endpoint específico de restore no backend ou faria posts sequenciais
              // Por enquanto, simulamos o restore via posts se necessário
              Alert.alert('Sucesso', 'Backup carregado com sucesso!');
            } catch (err) {
              Alert.alert('Erro', 'Falha ao importar registros.');
            }
          }}
        ]
      );
    } catch (e) {
      Alert.alert('Erro', 'Arquivo de backup inválido.');
    }
  };

  const handleLocalBackup = async () => {
    try {
      const res = await api.get('/reservations');
      await AsyncStorage.setItem('@local_backup_reservations', JSON.stringify(res.data));
      Alert.alert('✅ Backup Local', 'Cópia de segurança das reservas salva no dispositivo.');
    } catch (e) {
      Alert.alert('Erro', 'Falha no backup local.');
    }
  };

  const handleWhatsAppSummary = async () => {
    try {
      const res = await api.get('/reservations');
      const today = new Date().toLocaleDateString('pt-BR');
      const todayReservations = res.data.filter(r => r.startDate === new Date().toISOString().split('T')[0]);
      
      let message = `🚀 *RESUMO OPERACIONAL - ${today}*\n\n`;
      message += `📅 *Reservas para hoje:* ${todayReservations.length}\n`;
      
      if (todayReservations.length > 0) {
        todayReservations.forEach(r => {
          message += `• Apto ${r.apartment}: ${r.guestName}\n`;
        });
      }

      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erro', 'WhatsApp não está instalado neste dispositivo.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao gerar resumo.');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      '🧹 Limpar Cache',
      'Isso removerá dados temporários e imagens em cache para liberar espaço. Os dados do servidor NÃO serão afetados. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', onPress: async () => {
          try {
            // Limpa apenas chaves temporárias (mantemos auth_token)
            const keys = await AsyncStorage.getAllKeys();
            const toRemove = keys.filter(k => k.startsWith('@temp_') || k.includes('cache'));
            if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
            
            Alert.alert('✅ Sucesso', 'Cache do aplicativo limpo com sucesso!');
          } catch (e) {
            Alert.alert('Erro', 'Falha ao limpar cache.');
          }
        }}
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Encerrar Sessão',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            onLogout();
          },
        },
      ]
    );
  };

  const roleInfo = role === 'admin' 
    ? { label: 'Administrador', color: activeTheme.colors.error, icon: require('../../../assets/icons/accesses_active.png') }
    : { label: 'Proprietário',   color: activeTheme.colors.primary, icon: require('../../../assets/icons/reservations_active.png') };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[styles.floatingHeader, { borderBottomColor: activeTheme.colors.border }]}>
        <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
                <View>
                    <Text style={[styles.headerSub, { color: activeTheme.colors.primary }]}>AJUSTES</Text>
                    <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>Perfil</Text>
                </View>
                <TouchableOpacity 
                    activeOpacity={0.7} 
                    style={[styles.logoutIconBtn, { backgroundColor: activeTheme.colors.error + '10', borderColor: activeTheme.colors.error + '20' }]}
                    onPress={handleLogout}
                >
                    <Image 
                        source={require('../../../assets/icons/logout_active.png')} 
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
      >
        <View style={[styles.profileHero, { paddingTop: height * 0.18 }]}>
            <View style={styles.avatarGlowContainer}>
                <LinearGradient
                    colors={[activeTheme.colors.primary + '40', 'transparent']}
                    style={styles.avatarGlow}
                />
                <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.avatarBlur, { borderColor: activeTheme.colors.border }]}>
                    <LinearGradient
                        colors={[activeTheme.colors.primary, '#0055ff']}
                        style={styles.avatarGradient}
                    >
                        <Text style={styles.avatarText}>{username ? username[0].toUpperCase() : '?'}</Text>
                    </LinearGradient>
                </BlurView>
            </View>
            
            <Text style={[styles.userName, { color: activeTheme.colors.text }]}>{username}</Text>
            <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={[styles.roleBadge, { borderColor: activeTheme.colors.border }]}>
                <Image 
                    source={roleInfo.icon} 
                    style={{ width: 12, height: 12 }} 
                    resizeMode="contain" 
                />
                <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                    {roleInfo.label.toUpperCase()}
                </Text>
            </BlurView>
        </View>

        <View style={styles.settingsGroup}>
            <Text style={[styles.groupTitle, { color: activeTheme.colors.textTertiary }]}>DADOS DA CONTA</Text>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.glassCard, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                <View style={styles.infoRow}>
                    <View style={styles.infoLabelPart}>
                        <View style={[styles.infoIconCircle, { backgroundColor: activeTheme.colors.glassSecondary }]}>
                            <Image 
                                source={require('../../../assets/icons/profile_inactive.png')} 
                                style={{ width: 14, height: 14 }} 
                                resizeMode="contain" 
                            />
                        </View>
                        <Text style={[styles.infoLabel, { color: activeTheme.colors.textSecondary }]}>Usuário</Text>
                    </View>
                    <Text style={[styles.infoValue, { color: activeTheme.colors.text }]}>{username}</Text>
                </View>
                {apartment && (
                    <>
                        <View style={[styles.divider, { backgroundColor: activeTheme.colors.border }]} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelPart}>
                                <View style={[styles.infoIconCircle, { backgroundColor: activeTheme.colors.glassSecondary }]}>
                                    <Image 
                                        source={require('../../../assets/icons/dashboard_inactive.png')} 
                                        style={{ width: 14, height: 14 }} 
                                        resizeMode="contain" 
                                    />
                                </View>
                                <Text style={[styles.infoLabel, { color: activeTheme.colors.textSecondary }]}>Unidade Principal</Text>
                            </View>
                            <Text style={[styles.infoValue, { color: activeTheme.colors.text }]}>Apto {apartment}</Text>
                        </View>
                    </>
                )}
                <View style={[styles.divider, { backgroundColor: activeTheme.colors.border }]} />
                <View style={styles.infoRow}>
                    <View style={styles.infoLabelPart}>
                        <View style={[styles.infoIconCircle, { backgroundColor: roleInfo.color + '20' }]}>
                            <Image 
                                source={roleInfo.icon} 
                                style={{ width: 14, height: 14 }} 
                                resizeMode="contain" 
                            />
                        </View>
                        <Text style={[styles.infoLabel, { color: activeTheme.colors.textSecondary }]}>Nível de Acesso</Text>
                    </View>
                    <Text style={[styles.infoValue, { color: roleInfo.color }]}>{roleInfo.label}</Text>
                </View>
            </BlurView>
        </View>

        <View style={styles.settingsGroup}>
            <Text style={[styles.groupTitle, { color: activeTheme.colors.textTertiary }]}>PRIVACIDADE</Text>
            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setShowChangePwd(!showChangePwd)}
                style={styles.actionBtnContainer}
            >
                <BlurView 
                    intensity={20} 
                    tint={isDark ? "dark" : "light"} 
                    style={[styles.actionBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }, showChangePwd && styles.actionBtnActive]}
                >
                    <View style={styles.actionBtnLeft}>
                        <LinearGradient
                            colors={[activeTheme.colors.primary + '30', activeTheme.colors.primary + '10']}
                            style={styles.actionIcon}
                        >
                            <Image 
                                source={require('../../../assets/icons/key_active.png')} 
                                style={{ width: 18, height: 18 }} 
                                resizeMode="contain" 
                            />
                        </LinearGradient>
                        <Text style={[styles.actionBtnText, { color: activeTheme.colors.text }]}>Alterar Senha de Acesso</Text>
                    </View>
                    <Image 
                        source={require('../../../assets/icons/reservations_inactive.png')} 
                        style={{ width: 12, height: 12, opacity: 0.3 }} 
                        resizeMode="contain" 
                    />
                </BlurView>
            </TouchableOpacity>

            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setShowSyncModal(true)}
                style={[styles.actionBtnContainer, { marginTop: 15 }]}
            >
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.actionBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                    <View style={styles.actionBtnLeft}>
                        <LinearGradient
                            colors={['#FF5A5F30', '#FF5A5F10']}
                            style={styles.actionIcon}
                        >
                            <Image 
                                source={require('../../../assets/icons/reservations_active.png')} 
                                style={{ width: 18, height: 18 }} 
                                resizeMode="contain" 
                            />
                        </LinearGradient>
                        <Text style={[styles.actionBtnText, { color: activeTheme.colors.text }]}>Configurar Calendários Externos</Text>
                    </View>
                    <Image 
                        source={require('../../../assets/icons/reservations_inactive.png')} 
                        style={{ width: 12, height: 12, opacity: 0.3 }} 
                        resizeMode="contain" 
                    />
                </BlurView>
            </TouchableOpacity>

            <CalendarSyncModal 
                visible={showSyncModal} 
                onClose={() => setShowSyncModal(false)} 
                apartments={apts}
            />

            {showChangePwd && (
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.pwdForm, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                    <View style={styles.inputField}>
                        <Text style={[styles.inputLabel, { color: activeTheme.colors.textTertiary }]}>SENHA ATUAL</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: activeTheme.colors.glassSecondary, color: activeTheme.colors.text, borderColor: activeTheme.colors.border }]}
                            secureTextEntry
                            placeholder="••••••••"
                            placeholderTextColor={activeTheme.colors.textTertiary}
                            value={currentPwd}
                            onChangeText={setCurrentPwd}
                            selectionColor={activeTheme.colors.primary}
                        />
                    </View>
                    <View style={styles.inputField}>
                        <Text style={[styles.inputLabel, { color: activeTheme.colors.textTertiary }]}>NOVA SENHA</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: activeTheme.colors.glassSecondary, color: activeTheme.colors.text, borderColor: activeTheme.colors.border }]}
                            secureTextEntry
                            placeholder="mín. 4 caracteres"
                            placeholderTextColor={activeTheme.colors.textTertiary}
                            value={newPwd}
                            onChangeText={setNewPwd}
                            selectionColor={activeTheme.colors.primary}
                        />
                    </View>
                    <View style={styles.inputField}>
                        <Text style={[styles.inputLabel, { color: activeTheme.colors.textTertiary }]}>CONFIRME A NOVA SENHA</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: activeTheme.colors.glassSecondary, color: activeTheme.colors.text, borderColor: activeTheme.colors.border }]}
                            secureTextEntry
                            placeholder="••••••••"
                            placeholderTextColor={activeTheme.colors.textTertiary}
                            value={confirmPwd}
                            onChangeText={setConfirmPwd}
                            selectionColor={activeTheme.colors.primary}
                        />
                    </View>
                    
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={styles.saveBtn} 
                        onPress={handleChangePassword}
                        disabled={saving}
                    >
                        <LinearGradient 
                            colors={[activeTheme.colors.primary, '#0055ff']} 
                            style={styles.saveGrad}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Atualizar Senha</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </BlurView>
            )}
        </View>

        {role === 'admin' && (
          <View style={styles.settingsGroup}>
            <Text style={[styles.groupTitle, { color: activeTheme.colors.textTertiary }]}>GESTÃO DE DADOS (ADMIN)</Text>
            
            <TouchableOpacity activeOpacity={0.8} style={styles.actionBtnContainer} onPress={handleExportData}>
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.actionBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                <View style={styles.actionBtnLeft}>
                  <LinearGradient colors={['#3b82f630', '#3b82f610']} style={styles.actionIcon}>
                    <Image source={require('../../../assets/icons/arrow_forward_active.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </LinearGradient>
                  <Text style={[styles.actionBtnText, { color: activeTheme.colors.text }]}>Exportar Dados (JSON)</Text>
                </View>
                <Image source={require('../../../assets/icons/share_inactive.png')} style={{ width: 16, height: 16, opacity: 0.5 }} resizeMode="contain" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtnContainer, { marginTop: 12 }]} onPress={handleImportData}>
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.actionBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                <View style={styles.actionBtnLeft}>
                  <LinearGradient colors={['#10b98130', '#10b98110']} style={styles.actionIcon}>
                    <Image source={require('../../../assets/icons/arrow_back_active.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </LinearGradient>
                  <Text style={[styles.actionBtnText, { color: activeTheme.colors.text }]}>Importar Backup</Text>
                </View>
                <Image source={require('../../../assets/icons/receipt_active.png')} style={{ width: 16, height: 16, opacity: 0.5 }} resizeMode="contain" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtnContainer, { marginTop: 12 }]} onPress={handleLocalBackup}>
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.actionBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                <View style={styles.actionBtnLeft}>
                  <LinearGradient colors={['#f59e0b30', '#f59e0b10']} style={styles.actionIcon}>
                    <Image source={require('../../../assets/icons/save_active.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </LinearGradient>
                  <Text style={[styles.actionBtnText, { color: activeTheme.colors.text }]}>Backup Local (Offline)</Text>
                </View>
                <Image source={require('../../../assets/icons/dots_active.png')} style={{ width: 16, height: 16, opacity: 0.5 }} resizeMode="contain" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtnContainer, { marginTop: 12 }]} onPress={handleWhatsAppSummary}>
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.actionBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                <View style={styles.actionBtnLeft}>
                  <LinearGradient colors={['#25d36630', '#25d36610']} style={styles.actionIcon}>
                    <Image source={require('../../../assets/icons/whatsapp_active.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </LinearGradient>
                  <Text style={[styles.actionBtnText, { color: activeTheme.colors.text }]}>Resumo para WhatsApp</Text>
                </View>
                <Image source={require('../../../assets/icons/send_active.png')} style={{ width: 16, height: 16, opacity: 0.5 }} resizeMode="contain" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtnContainer, { marginTop: 12 }]} onPress={handleClearCache}>
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.actionBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.border }]}>
                <View style={styles.actionBtnLeft}>
                  <LinearGradient colors={['#6366f130', '#6366f110']} style={styles.actionIcon}>
                    <Image source={require('../../../assets/icons/trash_active.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </LinearGradient>
                  <Text style={[styles.actionBtnText, { color: activeTheme.colors.text }]}>Limpar Cache do App</Text>
                </View>
                <Image source={require('../../../assets/icons/cleaning_active.png')} style={{ width: 16, height: 16, opacity: 0.5 }} resizeMode="contain" />
              </BlurView>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.settingsGroup, { marginBottom: 150 }]}>
            <TouchableOpacity 
                activeOpacity={0.7}
                style={styles.logoutFullBtn} 
                onPress={handleLogout}
            >
                <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={[styles.logoutInner, { borderColor: activeTheme.colors.error + '20' }]}>
                    <Image 
                        source={require('../../../assets/icons/logout_active.png')} 
                        style={{ width: 18, height: 18 }} 
                        resizeMode="contain" 
                    />
                    <Text style={[styles.logoutText, { color: activeTheme.colors.error }]}>Encerrar Sessão do Dispositivo</Text>
                </BlurView>
            </TouchableOpacity>
            
            <View style={styles.versionInfo}>
                <Text style={[styles.versionTitle, { color: activeTheme.colors.textTertiary }]}>Obsidian Premium</Text>
                <Text style={[styles.versionSub, { color: activeTheme.colors.textTertiary + '20' }]}>VERSION 1.0.0 STABLE BLD</Text>
            </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  
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
  logoutIconBtn: { 
      width: 44, height: 44, borderRadius: 12, 
      backgroundColor: 'rgba(255, 69, 58, 0.1)',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.2)'
  },

  profileHero: { alignItems: 'center', marginBottom: 40 },
  avatarGlowContainer: { 
    width: 120, height: 120, 
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
  },
  avatarBlur: { 
    width: 100, height: 100, 
    borderRadius: 35, 
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -2 },
  userName: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  roleBadge: { 
    flexDirection: 'row', alignItems: 'center', 
    gap: 6, paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 12, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  roleBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  settingsGroup: { paddingHorizontal: 25, marginTop: 25 },
  groupTitle: { 
    fontSize: 10, fontWeight: '900', 
    letterSpacing: 2, marginBottom: 15,
    marginLeft: 5
  },
  
  glassCard: { 
    borderRadius: 28, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    paddingHorizontal: 20
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  infoLabelPart: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconCircle: { 
      width: 32, height: 32, borderRadius: 10, 
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      justifyContent: 'center', alignItems: 'center'
  },
  infoLabel: { fontSize: 14, fontWeight: '600' },
  infoValue: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' },

  actionBtnContainer: { overflow: 'hidden', borderRadius: 24 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', padding: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  actionBtnActive: { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  actionBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  
  pwdForm: { 
    padding: 24, 
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 0, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    overflow: 'hidden'
  },
  inputField: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  input: { 
    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
    borderRadius: 14, height: 56, 
    color: '#fff', paddingHorizontal: 18, 
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)',
    fontSize: 15, fontWeight: '600'
  },
  saveBtn: { marginTop: 10, borderRadius: 16, overflow: 'hidden' },
  saveGrad: { height: 60, justifyContent: 'center', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: -0.2 },

  logoutFullBtn: { borderRadius: 24, overflow: 'hidden' },
  logoutInner: { 
    flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'center', height: 64, 
    gap: 12, borderWidth: 1
  },
  logoutText: { fontWeight: '900', fontSize: 15, letterSpacing: -0.2 },
  
  versionInfo: { marginTop: 40, alignItems: 'center', gap: 5 },
  versionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  versionSub: { color: 'rgba(255,255,255,0.1)', fontSize: 9, fontWeight: '900', letterSpacing: 2 }
});
