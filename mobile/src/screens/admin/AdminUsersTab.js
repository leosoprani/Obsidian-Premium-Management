import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { theme } from '../../styles/theme';

import AdminAddUserModal from './AdminAddUserModal';

const ROLE_CONFIG = {
  'admin': { color: theme.colors.error, label: 'Administrador', icon: require('../../assets/icons/check_active.png') },
  'owner': { color: theme.colors.primary, label: 'Proprietário', icon: require('../../assets/icons/dashboard_active.png') },
  'staff': { color: theme.colors.secondary, label: 'Equipe', icon: require('../../assets/icons/people_active.png') },
};

function UserCard({ item, onEdit }) {
  const role = ROLE_CONFIG[item.role] || { color: theme.colors.textTertiary, label: item.role, icon: require('../../assets/icons/person_active.png') };
  const apts = Array.isArray(item.apartments) ? item.apartments.join(', ') : (item.apartment || '');
  
  return (
    <TouchableOpacity 
        style={styles.userCard} 
        activeOpacity={0.7} 
        onPress={() => onEdit(item)}
    >
        <View style={styles.cardContent}>
            <View style={[styles.iconBox, { backgroundColor: `${role.color}15` }]}>
                <Image source={role.icon} style={{ width: 22, height: 22 }} resizeMode="contain" />
            </View>
            
            <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.username}</Text>
                <Text style={styles.userRole}>
                    {role.label} {apts ? `• Apto ${apts}` : ''}
                </Text>
            </View>
            
            <Image source={require('../../assets/icons/chevron_forward_inactive.png')} style={{ width: 14, height: 14, opacity: 0.3 }} resizeMode="contain" />
        </View>
    </TouchableOpacity>
  );
}

export default function AdminUsersTab() {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>Equipe</Text>
            <Text style={styles.headerSub}>GESTÃO DE ACESSOS</Text>
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
                <Image source={require('../../assets/icons/add_white.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </LinearGradient>
        </TouchableOpacity>
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
        ListHeaderComponent={
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Image source={require('../../assets/icons/search_inactive.png')} style={{ width: 18, height: 18, marginRight: 8, opacity: 0.5 }} resizeMode="contain" />
              <TextInput 
                style={styles.searchInput}
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
                <Image source={require('../../assets/icons/people_inactive.png')} style={{ width: 48, height: 48, opacity: 0.5 }} resizeMode="contain" />
                <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: theme.spacing.lg, 
    paddingTop: theme.spacing.md, 
    paddingBottom: theme.spacing.lg 
  },
  headerTitle: { color: theme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  addBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  searchSection: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.colors.surfaceVariant, 
    borderRadius: theme.borderRadius.lg, 
    paddingHorizontal: theme.spacing.md, 
    borderWidth: 1, 
    borderColor: theme.colors.border 
  },
  searchIcon: { marginRight: theme.spacing.sm },
  searchInput: { flex: 1, height: 50, color: theme.colors.text, fontSize: 14, fontWeight: '500' },

  listContent: { paddingBottom: 100 },
  userCard: { 
    backgroundColor: theme.colors.surfaceVariant, 
    borderRadius: theme.borderRadius.xl, 
    padding: theme.spacing.lg, 
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md, 
    borderWidth: 1, 
    borderColor: theme.colors.border
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  userDetails: { flex: 1 },
  userName: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  userRole: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2, fontWeight: '500' },

  empty: { marginTop: 80, alignItems: 'center', gap: theme.spacing.md },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16, fontWeight: '500' }
});
