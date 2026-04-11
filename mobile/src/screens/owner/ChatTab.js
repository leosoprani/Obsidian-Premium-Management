import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Image, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import api, { BASE_URL } from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';

const PARTNER = 'admin';
const { width } = Dimensions.get('window');

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg, isMine }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={[
        styles.bubble, 
        isMine ? [styles.bubbleSent, { backgroundColor: activeTheme.colors.primary }] : [styles.bubbleReceived, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }],
      ]}>
        {msg.file && msg.file.type.startsWith('image/') && (
          <Image source={{ uri: msg.file.data }} style={styles.bubbleImage} />
        )}
        {msg.message ? (
          <Text style={[styles.bubbleText, isMine ? { color: '#fff' } : { color: activeTheme.colors.text }]}>
            {msg.message}
          </Text>
        ) : null}
        <Text style={[styles.bubbleTime, isMine ? { color: 'rgba(255,255,255,0.6)' } : { color: activeTheme.colors.textTertiary }]}>
            {formatTime(msg.timestamp)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatTab({ username: usernameProp, onRead, selectedApartment }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
    } catch (err) {}
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length]);

  const handleSendText = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText;
    setInputText('');
    setSending(true);
    try {
      await api.post('/messages', { to: PARTNER, message: text, apartment: selectedApartment });
    } catch (e) { Alert.alert('Erro', 'Falha ao enviar'); } finally { setSending(false); }
  };

  if (loading) {
    return (
        <View style={[styles.centered, { backgroundColor: activeTheme.colors.background }]}>
            <ActivityIndicator size="small" color={activeTheme.colors.primary} />
        </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <BlurView intensity={isDark ? 80 : 95} tint={isDark ? "dark" : "light"} style={[styles.header, { borderBottomColor: activeTheme.colors.border }]}>
        <View style={styles.headerContent}>
            <View style={styles.avatarWrap}>
                <LinearGradient 
                    colors={[activeTheme.colors.primary, '#0055ff']} 
                    style={styles.avatar}
                >
                    <Image source={require('../../assets/icons/check_white.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                </LinearGradient>
                <View style={[styles.statusDot, { backgroundColor: activeTheme.colors.secondary, borderColor: activeTheme.colors.background }]} />
            </View>
            <View>
                <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>Suporte</Text>
                <Text style={styles.headerStatusText}>ADMINISTRAÇÃO ONLINE</Text>
            </View>
        </View>
      </BlurView>

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
                />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />

        <BlurView intensity={isDark ? 90 : 100} tint={isDark ? "dark" : "light"} style={[styles.inputContainer, { borderTopColor: activeTheme.colors.border }]}>
            <TouchableOpacity 
                activeOpacity={0.7}
                style={styles.attachBtn}
            >
                <Image source={require('../../assets/icons/add_inactive.png')} style={{ width: 26, height: 26, opacity: 0.5 }} resizeMode="contain" />
            </TouchableOpacity>
            
            <View style={[styles.inputWrapper, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]}>
                <TextInput 
                    style={[styles.input, { color: activeTheme.colors.text }]}
                    placeholder="Sua mensagem..."
                    placeholderTextColor={activeTheme.colors.textTertiary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxHeight={100}
                />
            </View>

            <TouchableOpacity 
                activeOpacity={0.8}
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
                onPress={handleSendText}
                disabled={!inputText.trim() || sending}
            >
                <LinearGradient 
                    colors={[activeTheme.colors.primary, '#0055ff']} 
                    style={styles.sendGradient}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Image source={require('../../assets/icons/arrow_up_white.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    borderTopWidth: 1,
  },
  attachBtn: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputWrapper: { 
    flex: 1, 
    borderRadius: 22, 
    paddingHorizontal: 16, 
    marginHorizontal: 8, 
    borderWidth: 1, 
  },
  input: { fontSize: 15, paddingVertical: 10, minHeight: 44 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', marginBottom: 4 },
  sendBtnDisabled: { opacity: 0.4 },
  sendGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
