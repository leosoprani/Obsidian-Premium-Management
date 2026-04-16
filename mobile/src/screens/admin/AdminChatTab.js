import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Image, Dimensions, RefreshControl, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL } from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';
import { theme } from '../../styles/theme';
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioRecorder, AudioModule, useAudioPlayer } from 'expo-audio'; 
import { formatDateBR } from '../../utils/dateUtils';
import MeshBackground from '../../components/MeshBackground';

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
      // Re-play logic: if finished, seek to start
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
    <View style={[styles.whatsappAudioContainer, { backgroundColor: isMine ? 'transparent' : 'transparent' }]}>
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
                {/* Visual dots to simulate waveform */}
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
            <Image 
                source={{ uri: msg.file.data }} 
                style={[styles.bubbleImage, { width: width * 0.6, height: 180, borderRadius: 12, marginBottom: 8 }]} 
                resizeMode="cover"
            />
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

export default function AdminChatTab({ onRead }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [threads, setThreads] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // New conversation states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState(null);
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder({ extension: '.m4a', sampleRate: 44100, bitRate: 128000 });

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await api.get('/messages/threads');
      setThreads(res.data || []);
      if (onRead) onRead();
    } catch (e) {
      console.error('Load Threads Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMessages = useCallback(async (partner) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/${partner}`);
      setMessages(res.data || []);
      // Marcar como lidas
      api.post('/messages/read', { partner }).catch(() => {});
      if (onRead) onRead();
    } catch (e) {
      console.error('Load Messages Error:', e);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
    
    // Setup Socket
    try {
      const { io } = require('socket.io-client');
      const socket = io(BASE_URL, { transports: ['websocket'] });
      socketRef.current = socket;
      
      socket.on('new_message', (msg) => {
        // Se estiver na lista, recarregar threads
        loadThreads();
        
        // Se estiver no chat de quem mandou a mensagem, adicionar
        setMessages(prev => {
            // Se a msg é do parceiro selecionado OU se EU mandei para o parceiro selecionado
            if ((msg.from === selectedPartner) || (msg.to === selectedPartner && msg.from === 'admin')) {
                return [...prev, msg];
            }
            return prev;
        });
      });

      socket.on('message_deleted', ({ id }) => {
        setMessages(prev => prev.filter(m => m._id !== id));
      });

    } catch (error) {
        console.error('Socket Error:', error);
    }

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [loadThreads, selectedPartner]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length]);

  const handleOpenChat = (thread) => {
    setSelectedPartner(thread.username);
    setView('chat');
    loadMessages(thread.username);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedPartner(null);
    setMessages([]);
    loadThreads();
  };

  const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
          const res = await api.get('/users');
          // Filter: Only show Admins and Owners
          const filtered = (res.data || [])
            .filter(u => u.role === 'admin' || u.role === 'owner')
            .map(u => ({ ...u, type: 'user' }));
            
          setAllUsers(filtered);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingUsers(false);
      }
  };

  const startConversation = (user) => {
      setIsModalVisible(false);
      setSelectedPartner(user.username);
      setView('chat');
      loadMessages(user.username);
  };

  const handleLongPressMessage = (msg) => {
    // No AdminChat, o admin pode sempre excluir suas próprias mensagens
    // ou talvez qualquer mensagem se for um moderador rígido, mas por enquanto: 'admin'
    const isMine = msg.from === 'admin';
    
    Alert.alert(
      'Gerenciar Mensagem',
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


  const filteredUsers = allUsers.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendText = async () => {
    if (!inputText.trim() || sending || !selectedPartner) return;
    const text = inputText;
    setInputText('');
    setSending(true);
    try {
      await api.post('/messages', { to: selectedPartner, message: text });
    } catch (e) { 
      const errorMsg = e.response?.data?.message || 'Falha ao enviar mensagem.';
      Alert.alert('Erro', errorMsg); 
      setInputText(text); // Devolver texto ao input em caso de erro
    } finally { 
      setSending(false); 
    }
  };

  const handleAudioPress = async () => {
    if (!selectedPartner) return;
    
    // Check if recorder is available
    if (!recorder) {
      return Alert.alert('Erro', 'O gravador de áudio não foi inicializado corretamente.');
    }

    if (!isRecording) {
      try {
        const permissions = await AudioModule?.requestRecordingPermissionsAsync();
        const isGranted = permissions?.granted || permissions?.status === 'granted';
        
        if (!isGranted) {
          return Alert.alert('Permissão Negada', 'Habilite o microfone nas configurações para enviar áudios.');
        }

        // Initialize and start
        await recorder.prepareToRecordAsync({ extension: '.m4a', sampleRate: 44100, bitRate: 128000 });
        recorder.record();
        setIsRecording(true);
      } catch (e) {
        console.error('Start Recording Error:', e);
        Alert.alert('Erro na Gravação', `Falha ao acessar microfone: ${e.message}`);
      }
    } else {
      // Stop & Send
      setIsRecording(false);
      setSending(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
           const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
           await api.post('/messages', {
              to: selectedPartner,
              message: '',
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

  const handlePickImage = async () => {
    if (!selectedPartner) return;
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
        const imgData = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await api.post('/messages', { 
            to: selectedPartner, 
            message: '', 
            file: { data: imgData, type: 'image/jpeg' }
        });
      } catch (e) {
        Alert.alert('Erro', 'Falha ao enviar imagem');
      } finally {
        setSending(false);
      }
    }
  };

  if (view === 'list') {
    return (
      <View style={{ flex: 1 }}>
        <MeshBackground colors={activeTheme.colors.mesh} />
        <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={[styles.title, { color: activeTheme.colors.text }]}>Mensagens</Text>
                    <Text style={[styles.sub, { color: activeTheme.colors.primary }]}>CENTRO DE SUPORTE</Text>
                </View>
                <TouchableOpacity 
                    activeOpacity={0.7} 
                    style={[styles.plusBtn, { backgroundColor: activeTheme.colors.primary }]}
                    onPress={() => {
                        setIsModalVisible(true);
                        fetchUsers();
                    }}
                >
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>

        {loading ? (
            <ActivityIndicator style={{ marginTop: 50 }} color={activeTheme.colors.primary} />
        ) : (
            <FlatList
                data={threads}
                keyExtractor={(item) => item.username}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadThreads} tintColor={activeTheme.colors.primary} />}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Image source={require('../../../assets/icons/chat_inactive.png')} style={{ width: 60, height: 60, opacity: 0.2 }} resizeMode="contain" />
                        <Text style={[styles.emptyText, { color: activeTheme.colors.textTertiary }]}>Nenhuma conversa ativa.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        key={item.id || item._id} 
                        style={styles.threadCardWrapper}
                        onPress={() => handleOpenChat(item)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.threadCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent', borderWidth: 0 }]}>
                        <View style={[styles.avatarBox, { backgroundColor: item.role === 'owner' ? activeTheme.colors.primary + '20' : activeTheme.colors.secondary + '20' }]}>
                            <Text style={[styles.avatarInitial, { color: item.role === 'owner' ? activeTheme.colors.primary : activeTheme.colors.secondary }]}>
                                {item.username?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.threadDetails}>
                            <View style={styles.threadHeader}>
                                <Text style={[styles.threadName, { color: activeTheme.colors.text }]}>{item.username}</Text>
                                <Text style={[styles.threadTime, { color: activeTheme.colors.textTertiary }]}>{item.timestamp ? formatTime(item.timestamp) : ''}</Text>
                            </View>
                            <View style={styles.threadBottom}>
                                <Text style={[styles.lastMsg, { color: item.unreadCount > 0 ? activeTheme.colors.text : activeTheme.colors.textSecondary }]} numberOfLines={1}>
                                    {item.lastMessage || 'Inicie uma conversa'}
                                </Text>
                                {item.unreadCount > 0 && (
                                    <View style={[styles.unreadBadge, { backgroundColor: activeTheme.colors.secondary }]}>
                                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                    </View>
                                )}
                            </View>
                            {item.role === 'owner' && (
                                <Text style={[styles.threadApt, { color: activeTheme.colors.primary }]}>Apto {item.apartments?.join(', ') || 'N/A'}</Text>
                            )}
                        </View>
                        </View>
                    </TouchableOpacity>
                )}
            />
        )}
      </SafeAreaView>

      {/* New Conversation Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 10, 20, 0.98)' }]}>
              {Platform.OS === 'ios' && (
                  <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
              )}
              <SafeAreaView style={{ flex: 1 }}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Nova Conversa</Text>
                      <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                          <Text style={{ color: activeTheme.colors.primary, fontWeight: '700' }}>Fechar</Text>
                      </TouchableOpacity>
                  </View>

                  <View style={styles.modalSearchContainer}>
                      <TextInput 
                        style={[styles.modalSearchInput, { backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff' }]}
                        placeholder="Buscar proprietário ou hóspede..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                  </View>

                  {loadingUsers ? (
                      <ActivityIndicator style={{ marginTop: 40 }} color={activeTheme.colors.primary} />
                  ) : (
                      <FlatList 
                        data={filteredUsers}
                        keyExtractor={(item, idx) => item._id || String(idx)}
                        contentContainerStyle={{ padding: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={[styles.userListItem, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: activeTheme.colors.glassBorder }]}
                                onPress={() => startConversation(item)}
                            >
                                <View style={[styles.userListIcon, { backgroundColor: item.type === 'user' ? activeTheme.colors.primary + '20' : activeTheme.colors.secondary + '20' }]}>
                                    <Text style={{ color: item.type === 'user' ? activeTheme.colors.primary : activeTheme.colors.secondary, fontWeight: '800' }}>
                                        {item.username?.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                 <View>
                                    <Text style={[styles.userListNames, { color: '#ffffff' }]}>{item.username}</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{item.type === 'user' ? (item.role === 'admin' ? 'Administrador' : 'Proprietário') : 'Hóspede'}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                      />
                  )}
              </SafeAreaView>
          </View>
      </Modal>
    </View>
    );
  }

  // --- VIEW: CHAT ---
  return (
    <View style={{ flex: 1 }}>
      <MeshBackground colors={activeTheme.colors.mesh} />
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={[styles.chatHeader, { borderBottomColor: activeTheme.colors.glassBorder, backgroundColor: 'transparent' }]}>
        <TouchableOpacity onPress={handleBackToList} style={styles.backBtn}>
            <Image source={require('../../../assets/icons/arrow_back_white.png')} style={{ width: 20, height: 20, tintColor: activeTheme.colors.text }} resizeMode="contain" />
        </TouchableOpacity>
        <View style={styles.chatHeaderDetails}>
            <Text style={[styles.chatHeaderName, { color: activeTheme.colors.text }]}>{selectedPartner}</Text>
            <Text style={styles.chatHeaderStatus}>CONVERSA ATIVA</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loadingMessages ? (
            <ActivityIndicator style={{ flex: 1 }} color={activeTheme.colors.primary} />
        ) : (
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, idx) => item.id || item._id || String(idx)}
                renderItem={({ item }) => (
                    <MessageBubble 
                        msg={item} 
                        isMine={item.from === 'admin'} 
                        onImagePress={setFullScreenImage}
                        onLongPress={handleLongPressMessage}
                    />
                )}
                contentContainerStyle={styles.chatListContent}
                showsVerticalScrollIndicator={false}
            />
        )}

        <View style={[styles.inputContainer, { borderTopColor: activeTheme.colors.glassBorder, backgroundColor: 'transparent' }]}>
            <TouchableOpacity 
                activeOpacity={0.7}
                style={{ width: 40, height: 44, justifyContent: 'center', alignItems: 'center' }}
                onPress={handlePickImage}
            >
                <Image source={require('../../../assets/icons/add_inactive.png')} style={{ width: 26, height: 26, opacity: 0.5 }} resizeMode="contain" />
            </TouchableOpacity>

            <View style={styles.inputWrapperOverlay}>
                <View style={[styles.inputWrapper, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'transparent', borderWidth: 0 }]}>
                    <TextInput 
                        style={[styles.inputField, { color: activeTheme.colors.text }]}
                        placeholder="Sua resposta..."
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
  header: { paddingHorizontal: 25, paddingTop: 60, paddingBottom: 25 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  listContainer: { paddingHorizontal: 25, paddingBottom: 120 },
  threadCardWrapper: {
    marginBottom: 12,
    borderRadius: 30,
    overflow: 'hidden',
  },
  threadCard: { 
    flexDirection: 'row', 
    padding: 16, 
    borderRadius: 30, 
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarBox: { 
    width: 50, height: 50, borderRadius: 15, 
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15
  },
  avatarInitial: { color: '#fff', fontSize: 20, fontWeight: '800' },
  threadDetails: { flex: 1 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  threadName: { fontSize: 16, fontWeight: '800' },
  threadTime: { fontSize: 11, fontWeight: '600' },
  threadBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13, flex: 1, marginRight: 10 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  threadApt: { fontSize: 11, fontWeight: '700', marginTop: 4 },

  emptyContainer: { marginTop: 100, alignItems: 'center', gap: 15 },
  emptyText: { fontSize: 15, fontWeight: '600' },

  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginRight: 10 },
  chatHeaderDetails: { flex: 1 },
  chatHeaderName: { fontSize: 18, fontWeight: '800' },
  chatHeaderStatus: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  chatListContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  bubbleRow: { flexDirection: 'row', marginBottom: 16, width: '100%' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 20 },
  bubbleSent: { borderBottomRightRadius: 4 },
  bubbleReceived: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right', fontWeight: '500' },

  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: Platform.OS === 'ios' ? 95 : 85,
    borderTopWidth: 1
  },
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
  inputField: { fontSize: 15, paddingVertical: 10, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
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

  plusBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5
  },

  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      marginTop: 10
  },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  modalSearchContainer: { paddingHorizontal: 20 },
  modalSearchInput: {
      height: 50,
      borderRadius: 15,
      paddingHorizontal: 15,
      fontSize: 16
  },
  userListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderRadius: 20,
      marginBottom: 10,
      borderWidth: 1
  },
  userListIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15
  },
  userListNames: { fontSize: 16, fontWeight: '700' },

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

  // WhatsApp Audio Styles
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
