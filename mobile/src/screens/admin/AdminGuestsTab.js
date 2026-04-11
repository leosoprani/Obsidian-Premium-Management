import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { BlurView } from 'expo-blur';

export default function AdminGuestsTab({ onBack }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/guests');
      setGuests(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredGuests = guests.filter(g => 
    (g.name && g.name.toLowerCase().includes(searchText.toLowerCase())) ||
    (g.doc && g.doc.includes(searchText))
  );

  const renderItem = ({ item }) => (
    <BlurView intensity={20} tint="dark" style={styles.card}>
        <View style={styles.iconBox}>
            <Text style={styles.initials}>{(item.name || '?').substring(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.details}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.info}>{item.docType || 'DOC'}: {item.doc || '—'}</Text>
            {item.phone && <Text style={styles.info}>{item.phone}</Text>}
        </View>
        <TouchableOpacity style={styles.actionBtn}>
            <Image source={require('../../assets/icons/chevron_forward_inactive.png')} style={{ width: 14, height: 14, opacity: 0.3 }} resizeMode="contain" />
        </TouchableOpacity>
    </BlurView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Image source={require('../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
            <Text style={styles.title}>Hóspedes</Text>
            <Text style={styles.sub}>BASE DE CLIENTES</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
          <BlurView intensity={10} tint="light" style={styles.searchBar}>
              <Image source={require('../../assets/icons/search_inactive.png')} style={{ width: 18, height: 18, marginRight: 10, opacity: 0.5 }} resizeMode="contain" />
              <TextInput 
                style={styles.searchInput}
                placeholder="Buscar por nome ou documento..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={searchText}
                onChangeText={setSearchText}
              />
          </BlurView>
      </View>

      <FlatList
        data={filteredGuests}
        keyExtractor={(item, idx) => item._id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
            <View style={styles.empty}>
                <Image source={require('../../assets/icons/people_inactive.png')} style={{ width: 48, height: 48, opacity: 0.5 }} resizeMode="contain" />
                <Text style={styles.emptyText}>Nenhum hóspede encontrado.</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 25, 
      paddingTop: 20, 
      paddingBottom: 15,
      gap: 15
  },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: theme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { paddingHorizontal: 25, marginBottom: 20 },
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', 
    borderRadius: 15, paddingHorizontal: 15, height: 50,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },

  list: { paddingHorizontal: 25, paddingBottom: 100 },
  card: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: 16, 
      borderRadius: 20, 
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      overflow: 'hidden'
  },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(10, 132, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  initials: { color: theme.colors.primary, fontSize: 16, fontWeight: '800' },
  details: { flex: 1 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  info: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 2, fontWeight: '600' },
  actionBtn: { padding: 5 },

  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' }
});
