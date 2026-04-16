import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Image, Dimensions, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioRecorder, AudioModule, useAudioPlayer } from 'expo-audio';
import api, { BASE_URL } from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';
import { theme } from '../../styles/theme';
import MeshBackground from '../../components/MeshBackground';
import { useTabBarScroll } from '../../hooks/useTabBarScroll';

const PARTNER = 'admin';
const { width } = Dimensions.get('window');

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const AudioBubble = ({ uri, isMine }) => {
  const { theme: activeTheme } = React.useContext(ThemeContext);
  const player = useAudioPlayer(uri);

  const togglePlay = async () => {
    try {
      if (player.currentTime >= player.duration && player.duration > 0) {
        await player.seekTo(0);
      }
      
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (e) {
      console.error('Audio Playback Error:', e);
    }
  };

  const progress = player.duration > 0 ? (player.currentTime / player.duration) : 0;

  return (
    <View style={styles.whatsappAudioContainer}>
        <TouchableOpacity 
            onPress={togglePlay}
            style={[styles.waPlayBtn, { backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : activeTheme.colors.primary }]}
        >
            <Ionicons name={player.playing ? "pause" : "play"} size={22} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.waContent}>
            <View style={styles.waWaveBg}>
                <View style={[styles.waWaveFill, { 
                    width: `${progress * 100}%`, 
                    backgroundColor: isMine ? '#fff' : activeTheme.colors.primary 
                }]} />
                <View style={styles.waDotsRow}>
                    {[...Array(20)].map((_, i) => (
                        <View key={i} style={[styles.waDot, { backgroundColor: isMine ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }]} />
                    ))}
                </View>
            </View>
            <View style={styles.waInfoRow}>
                <Text style={[styles.waTime, { color: isMine ? 'rgba(255,255,255,0.7)' : activeTheme.colors.textSecondary }]}>
                    {formatDuration(player.currentTime)} / {formatDuration(player.duration)}
                </Text>
            </View>
        </View>
    </View>
  );
};

const MessageBubble = ({ msg, isMine, onImagePress, onLongPress }) => {
  const { theme: activeTheme } = React.useContext(ThemeContext);
  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <TouchableOpacity 
        activeOpacity={0.8}
        onLongPress={() => onLongPress(msg)}
        style={[
            styles.bubble, 
            isMine ? [styles.bubbleSent, { backgroundColor: activeTheme.colors.primary }] : [styles.bubbleReceived, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder }],
        ]}
      >
        {msg.file && msg.file.type.startsWith('image/') && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(msg.file.data)}>
            <Image source={{ uri: msg.file.data }} style={styles.bubbleImage} />
          </TouchableOpacity>
        )}
        {msg.file && msg.file.type.startsWith('audio/') && (
          <AudioBubble uri={msg.file.data} isMine={isMine} />
        )}
        {msg.message ? (
          <Text style={[styles.bubbleText, isMine ? { color: '#fff' } : { color: activeTheme.colors.text }]}>
            {msg.message}
          </Text>
        ) : null}
        <Text style={[styles.bubbleTime, isMine ? { color: 'rgba(255,255,255,0.6)' } : { color: activeTheme.colors.textTertiary }]}>
            {formatTime(msg.timestamp)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ChatTab({ username: usernameProp, onRead, selectedApartment }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const { handleScroll } = useTabBarScroll();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder({ extension: '.m4a', sampleRate: 44100, bitRate: 128000 });

  const flatListRef = useRef(null);
  const socketRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get(`/messages/${PARTNER}`);
      setMessages(res.data || []);
      api.post('/messages/read', { partner: PARTNER }).catch(() => {});
      if (onRead) onRead();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [onRead]);

  useEffect(() => {
    loadMessages();
    try {
      const { io } = require('socket.io-client');
      const socket = io(BASE_URL, { transports: ['websocket'] });
      socketRef.current = socket;
      socket.on('new_message', (msg) => {
        if (msg.from === PARTNER || msg.to === PARTNER) {
          setMessages(prev => [...prev, msg]);
          if (msg.from === PARTNER) {
            api.post('/messages/read', { partner: PARTNER }).catch(() => {});
            if (onRead) onRead();
          }
        }
      });
      socket.on('message_deleted', ({ id }) => {
        setMessages(prev => prev.filter(m => m._id !== id));
      });
    } catch (err) {}
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length]);

  const handleSendText = async () => {
    if (!inputText.trim() || sending) return;
    
    // Safety check for apartment (required for owners)
    if (!selectedApartment) {
      return Alert.alert('Atenção', 'Nenhum apartamento selecionado. Por favor, volte ao início e selecione uma unidade.');
    }

    const text = inputText;
    setInputText('');
    setSending(true);
    try {
      await api.post('/messages', { 
        to: PARTNER, 
        message: text, 
        apartment: selectedApartment 
      });
    } catch (e) { 
      const errorMsg = e.response?.data?.message || 'Falha ao enviar mensagem. Verifique sua conexão.';
      Alert.alert('Erro', errorMsg);
      setInputText(text); // Restore text on error
    } finally { 
      setSending(false); 
    }
  };

  const handleAudioPress = async () => {
    if (!recorder) {
      return Alert.alert('Erro', 'O gravador de áudio não foi inicializado.');
    }

    if (!isRecording) {
      try {
        const permissions = await AudioModule?.requestRecordingPermissionsAsync();
        const isGranted = permissions?.granted || permissions?.status === 'granted';
        
        if (!isGranted) {
          return Alert.alert('Permissão Negada', 'Habilite o microfone para enviar áudios.');
        }
        
        await recorder.prepareToRecordAsync({ extension: '.m4a', sampleRate: 44100, bitRate: 128000 });
        recorder.record();
        setIsRecording(true);
      } catch (e) {
        console.error('Start Recording Error:', e);
        Alert.alert('Erro na Gravação', `Falha ao acessar microfone: ${e.message}`);
      }
    } else {
      setIsRecording(false);
      setSending(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
           const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
           await api.post('/messages', {
              to: PARTNER,
              message: '',
              apartment: selectedApartment,
              file: {
                data: `data:audio/m4a;base64,${base64}`,
                type: 'audio/m4a'
              }
           });
        }
      } catch (e) {
        console.error('Stop Recording Error:', e);
        Alert.alert('Erro ao Enviar', `Falha no processamento: ${e.message}`);
      } finally {
         setSending(false);
      }
    }
  };
  const handleLongPressMessage = (msg) => {
    // No owner chat, o usuário só pode excluir suas próprias mensagens
    const isMine = msg.from !== PARTNER;
    if (!isMine) return;

    Alert.alert(
      'Excluir Mensagem',
      'Deseja excluir esta mensagem para todos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir para Todos', 
          style: 'destructive',
          onPress: async () => {
             const messageId = msg._id || msg.id;
             if (!messageId) {
               return Alert.alert('Erro', 'Não foi possível encontrar o ID desta mensagem.');
             }
             try {
               await api.delete(`/messages/${messageId}`);
             } catch (e) {
               console.error(e);
               const errorMsg = e.response?.data?.message || 'Não foi possível excluir a mensagem.';
               Alert.alert('Erro', errorMsg);
             }
          }
        }
      ]
    );
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permissão Negada', 'Precisamos de acesso às fotos para enviar anexos.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSending(true);
      try {
        // Mock sending image
        const imgData = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await api.post('/messages', { 
            to: PARTNER, 
            message: '', 
            apartment: selectedApartment,
            file: { data: imgData, type: 'image/jpeg' }
        });
      } catch (e) {
        Alert.alert('Erro', 'Falha ao enviar imagem');
      } finally {
        setSending(false);
      }
    }
  };

  if (loading) {
    return (
        <View style={[styles.centered, { backgroundColor: activeTheme.colors.background }]}>
            <ActivityIndicator size="small" color={activeTheme.colors.primary} />
        </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MeshBackground colors={activeTheme.colors.mesh} />
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={[styles.header, { borderBottomColor: activeTheme.colors.glassBorder, backgroundColor: 'transparent' }]}>
          <View style={styles.headerContent}>
              <View style={styles.avatarWrap}>
                  <LinearGradient 
                      colors={[activeTheme.colors.primary, '#0055ff']} 
                      style={styles.avatar}
                  >
                      <Image source={require('../../../assets/icons/check_white.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                  </LinearGradient>
                  <View style={[styles.statusDot, { backgroundColor: activeTheme.colors.secondary, borderColor: activeTheme.colors.background }]} />
              </View>
              <View>
                  <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>Suporte</Text>
                  <Text style={styles.headerStatusText}>ADMINISTRAÇÃO ONLINE</Text>
              </View>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, idx) => item.id || item._id || String(idx)}
              renderItem={({ item }) => (
                  <MessageBubble 
                      msg={item} 
                      isMine={item.from !== PARTNER} 
                      onImagePress={setFullScreenImage}
                      onLongPress={handleLongPressMessage}
                  />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
          />

          <View style={[styles.inputContainer, { borderTopColor: activeTheme.colors.glassBorder, backgroundColor: 'transparent' }]}>
              <TouchableOpacity 
                  activeOpacity={0.7}
                  style={styles.attachBtn}
                  onPress={handlePickImage}
              >
                  <Image source={require('../../../assets/icons/add_inactive.png')} style={{ width: 26, height: 26, opacity: 0.5 }} resizeMode="contain" />
              </TouchableOpacity>
              
              <View style={styles.inputWrapperOverlay}>
                  <View style={[styles.inputWrapper, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent', borderWidth: 0 }]}>
                      <TextInput 
                          style={[styles.input, { color: activeTheme.colors.text }]}
                          placeholder="Sua mensagem..."
                          placeholderTextColor={activeTheme.colors.textTertiary}
                          value={inputText}
                          onChangeText={setInputText}
                          multiline
                          blurOnSubmit={false}
                          maxHeight={100}
                      />
                  </View>
              </View>

              <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.sendBtn, (!inputText.trim() && !isRecording) && styles.sendBtnDisabled]} 
                  onPress={inputText.trim() ? handleSendText : handleAudioPress}
                  disabled={sending}
              >
                  <LinearGradient 
                      colors={isRecording ? ['#ff453a', '#ff9f0a'] : [activeTheme.colors.primary, '#0055ff']} 
                      style={styles.sendGradient}
                  >
                      {sending ? (
                          <ActivityIndicator size="small" color="#fff" />
                      ) : (
                          !inputText.trim() ? (
                              <Ionicons name={isRecording ? "stop" : "mic"} size={22} color="#FFF" />
                          ) : (
                              <Image source={require('../../../assets/icons/arrow_up_white.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                          )
                      )}
                  </LinearGradient>
              </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Full Screen Image Modal */}
      <Modal visible={!!fullScreenImage} transparent animationType="fade">
          <View style={styles.fullScreenOverlay}>
              <TouchableOpacity 
                style={StyleSheet.absoluteFill} 
                onPress={() => setFullScreenImage(null)} 
              />
              <Image 
                source={{ uri: fullScreenImage }} 
                style={styles.fullScreenImage} 
                resizeMode="contain" 
              />
              <TouchableOpacity 
                style={styles.closeImageBtn} 
                onPress={() => setFullScreenImage(null)}
              >
                  <Ionicons name="close" size={32} color="#FFF" />
              </TouchableOpacity>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { 
    paddingBottom: 12, 
    borderBottomWidth: 1, 
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusDot: { 
    position: 'absolute', bottom: -2, right: -2, 
    width: 12, height: 12, borderRadius: 6, 
    borderWidth: 2
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerStatusText: { color: '#34d399', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  listContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  bubbleRow: { flexDirection: 'row', marginBottom: 16, width: '100%' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },

  bubble: { maxWidth: '82%', padding: 12, borderRadius: 20 },
  bubbleSent: { 
    borderBottomRightRadius: 4 
  },
  bubbleReceived: { 
    borderBottomLeftRadius: 4, 
    borderWidth: 1, 
  },
  bubbleText: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right', fontWeight: '500' },
  bubbleImage: { width: 240, height: 180, borderRadius: 12, marginBottom: 8 },

  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    paddingHorizontal: 16, 
    paddingTop: 10, 
    paddingBottom: Platform.OS === 'ios' ? 95 : 85,
    borderTopWidth: 1,
  },
  attachBtn: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputWrapperOverlay: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 10,
  },
  inputWrapper: { 
    flex: 1, 
    borderRadius: 22, 
    paddingHorizontal: 16, 
    borderWidth: 1 
  },
  input: { fontSize: 15, paddingVertical: 10, minHeight: 44 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', marginBottom: 4 },
  sendBtnDisabled: { opacity: 0.4 },
  sendGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  audioBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 12,
    minWidth: 160,
    marginBottom: 8
  },
  audioWaveContainer: {
    flex: 1,
    height: 30,
    justifyContent: 'center'
  },
  audioWave: {
    height: 4,
    borderRadius: 2,
    width: '100%'
  },
  audioText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4
  },

  fullScreenOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center'
  },
  fullScreenImage: {
      width: width,
      height: width * 1.5,
  },
  closeImageBtn: {
      position: 'absolute',
    top: 50,
    right: 25,
    padding: 10
  },
  whatsappAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 220,
    gap: 12
  },
  waPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  waContent: {
    flex: 1,
    gap: 4
  },
  waWaveBg: {
    height: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative'
  },
  waWaveFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 7
  },
  waDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    alignItems: 'center',
    height: '100%'
  },
  waDot: {
    width: 2,
    height: 6,
    borderRadius: 1
  },
  waInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  waTime: {
    fontSize: 10,
    fontWeight: '600'
  }
});
