import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../../styles/ThemeContext';
import { theme } from '../../styles/theme';

export default function AdminOperationalMenu({ onNavigate }) {
  const { theme: activeTheme, isDark } = React.useContext(ThemeContext);
  const menuItems = [
    { 
      id: 'cleanings', 
      title: 'Limpezas', 
      desc: 'Cronograma e agendamento', 
      icon: require('../../../assets/icons/maintenance_white.png'), 
      color: activeTheme.colors.secondary,
      gradient: [activeTheme.colors.secondary, isDark ? '#1ea345' : '#28d85f']
    },
    { 
      id: 'maintenances', 
      title: 'Reparos', 
      desc: 'Manutenção e consertos', 
      icon: require('../../../assets/icons/maintenance_white.png'), 
      color: activeTheme.colors.primary,
      gradient: [activeTheme.colors.primary, isDark ? '#0055ff' : '#007aff']
    },
    { 
      id: 'blockings', 
      title: 'Bloqueios', 
      desc: 'Indisponibilidade de aptos', 
      icon: require('../../../assets/icons/accesses_white.png'), 
      color: activeTheme.colors.error,
      gradient: [activeTheme.colors.error, isDark ? '#ff4b2b' : '#ff3b30']
    },
    { 
      id: 'employees', 
      title: 'Equipe', 
      desc: 'Gestão de colaboradores', 
      icon: require('../../../assets/icons/profile_white.png'), 
      color: activeTheme.colors.textSecondary,
      gradient: isDark ? ['#64748b', '#334155'] : ['#8e8e93', '#636366']
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: activeTheme.colors.text }]}>Manutenção</Text>
        <Text style={[styles.sub, { color: activeTheme.colors.primary }]}>GESTÃO OPERACIONAL</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.card, { backgroundColor: activeTheme.colors.surfaceVariant, borderColor: activeTheme.colors.border }]}
              activeOpacity={0.8}
              onPress={() => onNavigate(item.id)}
            >
              <LinearGradient colors={item.gradient} style={styles.cardIcon}>
                <Image 
                  source={item.icon} 
                  style={{ width: 32, height: 32 }}
                  resizeMode="contain"
                />
              </LinearGradient>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: activeTheme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.cardDesc, { color: activeTheme.colors.textSecondary }]}>{item.desc}</Text>
              </View>
              <Image 
                source={require('../../../assets/icons/reservations_inactive.png')} 
                style={{ width: 14, height: 14, opacity: 0.3 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 25 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 120 },
  grid: { gap: 16 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 18, 
    borderRadius: 24, 
    borderWidth: 1
  },
  cardIcon: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardDesc: { fontSize: 13, marginTop: 4, fontWeight: '500' }
});
