import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import AdminAddEmployeeModal from './AdminAddEmployeeModal';

export default function AdminEmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${theme.colors.secondary}15` }]}>
        <Image source={require('../../assets/icons/people_active.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
      </View>
      <TouchableOpacity 
        style={styles.details} 
        onPress={() => { setSelectedItem(item); setShowModal(true); }}
      >
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userRole}>{item.role || 'Colaborador'}</Text>
        {item.doc ? <Text style={styles.docText}>Doc: {item.doc}</Text> : null}
      </TouchableOpacity>
      
      
      <Image source={require('../../assets/icons/chevron_forward_inactive.png')} style={{ width: 14, height: 14, opacity: 0.3 }} resizeMode="contain" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Empregados</Text>
          <Text style={styles.sub}>EQUIPE OPERACIONAL</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => { setSelectedItem(null); setShowModal(true); }}
        >
          <LinearGradient colors={[theme.colors.secondary, '#1ea345']} style={styles.addGrad}>
            <Image source={require('../../assets/icons/add_white.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item, idx) => item._id || item.id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.secondary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image source={require('../../assets/icons/people_inactive.png')} style={{ width: 48, height: 48, opacity: 0.5 }} resizeMode="contain" />
            <Text style={styles.emptyText}>Nenhum funcionário cadastrado.</Text>
          </View>
        }
      />

      <AdminAddEmployeeModal 
        visible={showModal} 
        onClose={() => setShowModal(false)} 
        onRefresh={loadData}
        initialData={selectedItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingTop: 20, paddingBottom: 25 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: theme.colors.secondary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 25, paddingBottom: 100 },
  card: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceVariant, 
    padding: 18, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border 
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  userRole: { color: theme.colors.secondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  docText: { color: theme.colors.textTertiary, fontSize: 11, marginTop: 4 },
  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' }
});
