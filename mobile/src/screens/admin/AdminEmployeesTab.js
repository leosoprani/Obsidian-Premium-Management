import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { ThemeContext } from '../../styles/ThemeContext';
import { theme } from '../../styles/theme';
import AdminAddEmployeeModal from './AdminAddEmployeeModal';
import MeshBackground from '../../components/MeshBackground';

export default function AdminEmployeesTab({ onBack }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
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
    <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder, borderWidth: 1 }]}>
            <View style={[styles.iconBox, { backgroundColor: `${activeTheme.colors.secondary}15` }]}>
                <Image source={require('../../../assets/icons/people_active.png')} style={{ width: 22, height: 22, tintColor: activeTheme.colors.secondary }} resizeMode="contain" />
            </View>
            <TouchableOpacity 
                style={styles.details} 
                activeOpacity={0.7}
                onPress={() => { setSelectedItem(item); setShowModal(true); }}
            >
                <Text style={[styles.userName, { color: activeTheme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.userRole, { color: activeTheme.colors.secondary }]}>{item.role || 'Colaborador'}</Text>
                {item.doc ? <Text style={[styles.docText, { color: activeTheme.colors.textTertiary }]}>Doc: {item.doc}</Text> : null}
            </TouchableOpacity>
            <Image source={require('../../../assets/icons/chevron_forward_active.png')} style={{ width: 14, height: 14, tintColor: activeTheme.colors.textTertiary, opacity: 0.3 }} resizeMode="contain" />
        </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <MeshBackground colors={activeTheme.colors.mesh} />
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.header}>
        {onBack && (
            <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: activeTheme.colors.glass, borderColor: activeTheme.colors.glassBorder,  }]}>
                <Image source={require('../../../assets/icons/chevron_back_active.png')} style={{ width: 24, height: 24, tintColor: activeTheme.colors.primary}} resizeMode="contain" />
            </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: activeTheme.colors.text }]}>Empregados</Text>
          <Text style={[styles.sub, { color: activeTheme.colors.secondary }]}>EQUIPE OPERACIONAL</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => { setSelectedItem(null); setShowModal(true); }}
        >
          <LinearGradient colors={[activeTheme.colors.secondary, '#1ea345']} style={styles.addGrad}>
            <Image source={require('../../../assets/icons/add_white.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
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
            <Image source={require('../../../assets/icons/team_white.png')} style={{ width: 48, height: 48, opacity: 0.3 }} resizeMode="contain" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 25 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  sub: { color: theme.colors.secondary, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  addGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 0, paddingBottom: 100 },
  cardWrapper: {
    marginHorizontal: 25,
    marginBottom: 16,
    borderRadius: 30,
    overflow: 'hidden',
  },
  userCard: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 18, borderRadius: 30, borderWidth: 1.5,
    overflow: 'hidden',
  },
  card: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 18, borderRadius: 30, borderWidth: 1.5,
    overflow: 'hidden',
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  details: { flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  userRole: { color: theme.colors.secondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  docText: { color: theme.colors.textTertiary, fontSize: 11, marginTop: 4 },
  empty: { marginTop: 80, alignItems: 'center', gap: 15 },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '600' },
  list: { paddingHorizontal: 0, paddingBottom: 100 },
});
