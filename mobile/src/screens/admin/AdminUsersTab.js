import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';
import { ThemeContext } from '../../styles/ThemeContext';

import AdminAddUserModal from './AdminAddUserModal';
import MeshBackground from '../../components/MeshBackground';
import { useTabBarScroll } from '../../hooks/useTabBarScroll';

const ROLE_CONFIG = {
  'admin': { color: theme.colors.error, label: 'Administrador', icon: require('../../../assets/icons/check_active.png') },
  'owner': { color: theme.colors.primary, label: 'Proprietário', icon: require('../../../assets/icons/dashboard_active.png') },
  'staff': { color: theme.colors.secondary, label: 'Equipe', icon: require('../../../assets/icons/people_active.png') },
};

function UserCard({ item, onEdit }) {
  const { isDark } = React.useContext(ThemeContext);
  const role = ROLE_CONFIG[item.role] || { color: theme.colors.textTertiary, label: item.role, icon: require('../../../assets/icons/person_active.png') };
  const apts = Array.isArray(item.apartments) ? item.apartments.join(', ') : (item.apartment || '');
  
  return (
    <TouchableOpacity 
        onPress={() => onEdit(item)}
        activeOpacity={0.7}
        style={styles.userCardWrapper}
    >
        <View style={[styles.userCard, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder }]}>
            <View style={styles.cardContent}>
                <View style={[styles.iconBox, { backgroundColor: `${role.color}15` }]}>
                    <Image source={role.icon} style={{ width: 22, height: 22 }} resizeMode="contain" />
                </View>
                
                <View style={styles.userDetails}>
                    <Text style={[styles.userName, { color: theme.colors.text }]}>{item.username}</Text>
                    <Text style={[styles.userRole, { color: theme.colors.textSecondary }]}>
                        {role.label} {apts ? `• Apto ${apts}` : ''}
                    </Text>
                </View>
                
                <Image 
                    source={require('../../../assets/icons/chevron_forward_active.png')} 
                    style={{ width: 14, height: 14, tintColor: theme.colors.textTertiary }} 
                    resizeMode="contain" 
                />
            </View>
        </View>
    </TouchableOpacity>
  );
}

export default function AdminUsersTab() {
  const { handleScroll } = useTabBarScroll();
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
      setFiltered(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onSearch = (text) => {
    setSearchText(text);
    if (!text) {
      setFiltered(users);
    } else {
      const low = text.toLowerCase();
      setFiltered(users.filter(u => 
        u.username.toLowerCase().includes(low) ||
        (u.apartments && u.apartments.join(',').toLowerCase().includes(low)) ||
        (u.apartment && u.apartment.toLowerCase().includes(low))
      ));
    }
  };

  if (loading) {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MeshBackground colors={theme.colors.mesh} />
      {/* HEADER */}
      <View style={[styles.floatingHeader, { backgroundColor: theme.colors.mesh[0] }]} pointerEvents="box-none">
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View>
                <Text style={[styles.headerSub, { color: theme.colors.primary }]}>GESTÃO DE ACESSOS</Text>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Equipe</Text>
            </View>
            <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.addBtn} 
                onPress={() => setIsModalVisible(true)}
            >
                <LinearGradient 
                    colors={[theme.colors.primary, '#0055ff']} 
                    style={styles.addBtnGrad}
                >
                    <Image source={require('../../../assets/icons/add_active.png')} style={{ width: 24, height: 24, tintColor: '#fff' }} resizeMode="contain" />
                </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        {/* Scroll Mask - Gradiente para desvanecer o conteúdo com a cor do topo do Mesh */}
        <LinearGradient
            colors={[theme.colors.mesh[0], 'transparent']}
            style={{ position: 'absolute', bottom: -60, left: 0, right: 0, height: 60 }}
            pointerEvents="none"
        />
      </View>

      <AdminAddUserModal 
          visible={isModalVisible} 
          initialData={selectedUser}
          onClose={() => { setIsModalVisible(false); setSelectedUser(null); }} 
          onRefresh={loadData} 
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id || item.id}
        renderItem={({ item }) => (
            <UserCard 
                item={item} 
                onEdit={(u) => {
                    setSelectedUser(u);
                    setIsModalVisible(true);
                }} 
            />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={loadData} 
                tintColor={theme.colors.primary} 
            />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={[styles.searchSection, { marginTop: 150 }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder }]}>
              <Image source={require('../../../assets/icons/search_active.png')} style={{ width: 18, height: 18, marginRight: 8, opacity: 0.5, tintColor: theme.colors.text }} resizeMode="contain" />
              <TextInput 
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Buscar por nome ou apartamento..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchText}
                onChangeText={onSearch}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
            <View style={styles.empty}>
                <Image source={require('../../../assets/icons/people_active.png')} style={{ width: 48, height: 48, opacity: 0.3, tintColor: theme.colors.textTertiary }} resizeMode="contain" />
                <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>Nenhum usuário encontrado.</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 10, 
    paddingBottom: 20 
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerTitle: { color: theme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  addBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  searchSection: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  userCard: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 18, borderRadius: 30, marginBottom: 16, borderWidth: 1.5,
    overflow: 'hidden',
  },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: theme.borderRadius.lg, 
    paddingHorizontal: theme.spacing.md, 
    borderWidth: 1, 
    overflow: 'hidden'
  },
  searchIcon: { marginRight: theme.spacing.sm },
  searchInput: { flex: 1, height: 50, color: theme.colors.text, fontSize: 14, fontWeight: '500' },

  listContent: { paddingBottom: 100 },
  userCardWrapper: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: 30,
    overflow: 'hidden',
  },
  userCard: { 
    padding: theme.spacing.lg, 
    borderRadius: 30, 
    borderWidth: 1.5,
    overflow: 'hidden'
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  userDetails: { flex: 1 },
  userName: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  userRole: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  userEmail: { color: theme.colors.textTertiary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  
  statusBadgeText: { fontSize: 10, fontWeight: '900' },

  empty: { marginTop: 80, alignItems: 'center', gap: theme.spacing.md },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '500' }
});
