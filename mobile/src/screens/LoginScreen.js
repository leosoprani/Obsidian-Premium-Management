import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../services/api';
import { ThemeContext } from '../styles/ThemeContext';
import MeshBackground from '../components/MeshBackground';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Fallback logic for Web where SecureStore is not available
const secureStorage = {
  getItem: async (key) => {
    try {
      if (isWeb) return await AsyncStorage.getItem(`@web_secure_${key}`);
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (isWeb) return await AsyncStorage.setItem(`@web_secure_${key}`, value);
      return await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('Storage error:', e);
    }
  },
  deleteItem: async (key) => {
    try {
      if (isWeb) return await AsyncStorage.removeItem(`@web_secure_${key}`);
      return await SecureStore.deleteItemAsync(key);
    } catch (e) {}
  }
};

export default function LoginScreen({ navigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { theme: activeTheme, isDark, toggleTheme } = React.useContext(ThemeContext);

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    loadSavedUsername();
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    if (isWeb) {
      setIsBiometricSupported(false);
      return;
    }
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);
    } catch (e) {
      setIsBiometricSupported(false);
    }
  };

  const loadSavedUsername = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('@saved_username');
      const savedPass = await secureStorage.getItem('saved_password');
      if (savedUser) {
        setUsername(savedUser);
        setRememberMe(true);
      }
      if (savedPass) {
        setPassword(savedPass);
      }
    } catch (e) { console.error('Error loading saved credentials', e); }
  };

  const handleLogin = async () => {
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/login', { username: trimmedUser, password: trimmedPass });
      
      const { accessToken, role, apartments } = response.data;
      
      // Always save credentials for biometrics after successful login
      await secureStorage.setItem('biometric_user', trimmedUser);
      await secureStorage.setItem('biometric_pass', trimmedPass);

      if (rememberMe) {
        await AsyncStorage.setItem('@saved_username', trimmedUser);
        await secureStorage.setItem('saved_password', trimmedPass);
      } else {
        await AsyncStorage.removeItem('@saved_username');
        await secureStorage.deleteItem('saved_password');
      }

      await AsyncStorage.setItem('@auth_token', accessToken);
      await AsyncStorage.setItem('@user_role', role);
      await AsyncStorage.setItem('@user_username', trimmedUser);
      await AsyncStorage.setItem('@user_phone', response.data.phone || '');
      
      if (apartments && Array.isArray(apartments)) {
        await AsyncStorage.setItem('@user_apartments', JSON.stringify(apartments));
      } else if (response.data.apartment) {
        await AsyncStorage.setItem('@user_apartments', JSON.stringify([response.data.apartment]));
      }

      navigate('Dashboard');

    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor.';
      Alert.alert('Falha no Login', message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticação Biométrica',
        fallbackLabel: 'Usar Senha',
      });

      if (result.success) {
        const savedUser = await secureStorage.getItem('biometric_user');
        const savedPass = await secureStorage.getItem('biometric_pass');

        if (savedUser && savedPass) {
          setUsername(savedUser);
          setPassword(savedPass);
          
          setLoading(true);
          const response = await api.post('/auth/login', { username, password });
          const { accessToken, role, apartments } = response.data;
          
          console.log(`Login Success! User: ${username}, Role: ${role}`);
          if (rememberMe) {
              await AsyncStorage.setItem('@saved_username', username);
              await secureStorage.setItem('saved_password', password);
          } else {
              await AsyncStorage.removeItem('@saved_username');
              await secureStorage.deleteItem('saved_password');
          }

          await AsyncStorage.setItem('@auth_token', accessToken);
          await AsyncStorage.setItem('@user_role', role);
          await AsyncStorage.setItem('@user_username', username);
          await AsyncStorage.setItem('@user_phone', response.data.phone || '');
          if (apartments && Array.isArray(apartments)) {
              await AsyncStorage.setItem('@user_apartments', JSON.stringify(apartments));
          }
          
          // Navigate or trigger parent login state
          if (typeof navigate === 'function') {
              console.log('Navigating to dashboard...');
              navigate(); 
          }
        } else {
          Alert.alert('Atenção', 'Faça o primeiro login com senha para ativar a biometria.');
        }
      }
    } catch (e) {
      console.error('Biometric Login Error:', e);
      Alert.alert('Erro', 'Falha na autenticação biométrica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Dynamic Background Elements */}
      <MeshBackground colors={activeTheme.colors.mesh} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.themeToggle} 
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <View style={styles.themeToggleBlur}>
                  <Image 
                    source={isDark ? require('../../assets/icons/sun_active.png') : require('../../assets/icons/moon_active.png')} 
                    style={{ width: 22, height: 22 }} 
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
              <Text style={[styles.brandTitle, { color: activeTheme.colors.text }]}>Obsidian</Text>
              <View style={styles.subtitleContainer}>
                  <View style={styles.line} />
                  <Text style={[styles.brandSubtitle, { color: activeTheme.colors.primary }]}>PREMIUM MANAGEMENT</Text>
                  <View style={[styles.line, { backgroundColor: activeTheme.colors.primary + '20' }]} />
              </View>
            </View>

            <View style={styles.cardWrapper}>
              <View style={[styles.glassCard, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
                  <View style={styles.inputSection}>
                    <View style={styles.inputWrapper}>
                        <Text style={[styles.label, { color: activeTheme.colors.textSecondary }]}>NOME DE USUÁRIO</Text>
                        <TextInput
                            style={[styles.input, { color: activeTheme.colors.text, backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}
                            placeholder="ex: joao@obsidian.com"
                            placeholderTextColor={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            editable={!loading}
                            selectionColor={activeTheme.colors.primary}
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={[styles.label, { color: activeTheme.colors.textSecondary }]}>SENHA DE ACESSO</Text>
                        <View style={[styles.passwordContainer, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
                            <TextInput
                                style={[styles.input, { flex: 1, borderWidth: 0, height: '100%', color: activeTheme.colors.text, backgroundColor: 'transparent' }]}
                                placeholder="••••••••"
                                placeholderTextColor={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                editable={!loading}
                                selectionColor={activeTheme.colors.primary}
                            />
                            <TouchableOpacity 
                                style={styles.eyeIcon} 
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Image 
                                    source={showPassword ? require('../../assets/icons/eye_off_inactive.png') : require('../../assets/icons/eye_inactive.png')} 
                                    style={{ width: 22, height: 22, opacity: 0.4 }} 
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.rememberMeContainer} 
                        onPress={() => setRememberMe(!rememberMe)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, { borderColor: activeTheme.colors.border }, rememberMe && [styles.checkboxChecked, { backgroundColor: activeTheme.colors.primary, borderColor: activeTheme.colors.primary }]]}>
                            {rememberMe && <Image source={require('../../assets/icons/check_white.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />}
                        </View>
                        <Text style={[styles.rememberMeText, { color: activeTheme.colors.textSecondary }]}>Lembrar meu usuário</Text>
                    </TouchableOpacity>

                    <View style={styles.loginRow}>
                      <TouchableOpacity 
                          activeOpacity={0.8}
                          onPress={handleLogin}
                          disabled={loading}
                          style={[styles.loginBtnContainer, { flex: 1 }]}
                      >
                          <LinearGradient
                              colors={[activeTheme.colors.primary, '#0055ff']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.button, loading && styles.buttonDisabled]}
                          >
                              {loading ? (
                                  <ActivityIndicator color="#ffffff" />
                              ) : (
                                   <View style={styles.btnContent}>
                                      <Text style={styles.buttonText}>Acessar Portal</Text>
                                      <Image source={require('../../assets/icons/arrow_forward_white.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                                   </View>
                              )}
                          </LinearGradient>
                      </TouchableOpacity>

                      {isBiometricSupported && (
                        <TouchableOpacity 
                          style={styles.biometricBtn} 
                          onPress={handleBiometricLogin}
                          disabled={loading}
                        >
                          <LinearGradient
                            colors={isDark ? ['#1a1a1c', '#0f0f11'] : ['#f0f0f2', '#e8e8ea']}
                            style={styles.biometricGrad}
                          >
                            <View style={[styles.scannerRing, { borderColor: activeTheme.colors.primary + '40' }]}>
                                <Image 
                                    source={require('../../assets/icons/fingerprint_custom.png')} 
                                    style={{ width: 34, height: 34, tintColor: activeTheme.colors.primary }} 
                                    resizeMode="contain" 
                                />
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.6}>
                <Text style={[styles.forgotText, { color: activeTheme.colors.textSecondary }]}>Esqueceu suas credenciais?</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={[styles.copyrightText, { color: activeTheme.colors.textTertiary }]}>
                    Desenvolvido por L. Soprani copyright 2026
                </Text>
                <Text style={[styles.versionText, { color: activeTheme.colors.textTertiary }]}>
                    Versão {Constants.expoConfig?.version || '1.0.4'}
                </Text>
            </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <Modal transparent visible={loading} animationType="fade">
          <View style={styles.loadingOverlay}>
              <BlurView  intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[styles.loadingBox, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }]}>
                  <ActivityIndicator size="large" color={activeTheme.colors.primary} />
                  <Text style={[styles.loadingText, { color: activeTheme.colors.text }]}>Autenticando...</Text>
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  meshGradientTop: {
    position: 'absolute',
    top: -height * 0.2,
    right: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
  },
  meshGradientBottom: {
    position: 'absolute',
    bottom: -height * 0.3,
    left: -width * 0.3,
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
  },
  keyboardView: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  themeToggle: { alignSelf: 'flex-end', marginBottom: -20, zIndex: 10 },
  themeToggleBlur: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',  borderColor: 'rgba(255,255,255,0.05)' },
  header: { alignItems: 'center', marginBottom: 50 },
  brandTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -3,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(10, 132, 255, 0.1)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 4
      },
      android: {
        textShadowColor: 'rgba(10, 132, 255, 0.1)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 4
      },
      web: {
        textShadow: '0px 4px 4px rgba(10, 132, 255, 0.1)'
      }
    })
  },
  subtitleContainer: { flexDirection: 'row', alignItems: 'center', marginTop: -5, gap: 10 },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
  },
  line: { flex: 1, height: 1 },

  cardWrapper: {
    borderRadius: 32,
  },
  glassCard: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
  },
  inputSection: { padding: 30, gap: 24 },
  inputWrapper: { gap: 8 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 4
  },
  input: {
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
  },
  loginRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 10 },
  biometricBtn: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
  },
  biometricGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  scannerRing: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnContainer: { },
  button: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  buttonDisabled: { opacity: 0.5 },
  
  forgotText: { 
    fontSize: 14, 
    fontWeight: '600' 
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 60,
    overflow: 'hidden'
  },
  eyeIcon: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center'
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
    marginLeft: 4,
    gap: 10
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: {
  },
  rememberMeText: {
    fontSize: 14,
    fontWeight: '600'
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 20,
    gap: 4
  },
  copyrightText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.8
  },
  versionText: {
    fontSize: 10,
    fontWeight: '800',
    opacity: 0.4
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  loadingBox: {
    padding: 30,
    borderRadius: 30,
    alignItems: 'center',
    gap: 15,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  }
});
