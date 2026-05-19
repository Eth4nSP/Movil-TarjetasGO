import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [initializing, setInitializing] = useState(true); // Nuevo: estado de carga inicial

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuario logueado
        setUserName(user.displayName || 'Estudiante');
        setInitializing(false);
      } else {
        // SI NO ESTÁ LOGUEADO: Lo mandamos al login
        // Usamos replace para que no pueda volver atrás con el botón del celular
        router.replace('../../auth/login'); 
      }
    });
    return unsubscribe;
  }, []);

  // Mientras verifica la sesión, mostramos una pantalla de carga para que no "parpadee" el Home
  if (initializing) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A1CEDC" />
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Cabecera de bienvenida */}
      <View style={styles.welcomeSection}>
        <ThemedText type="title" style={styles.title}>¡Hola, {userName}! 👋</ThemedText>
        <ThemedText style={styles.subtitle}>Bienvenido a TarjetasGO</ThemedText>
      </View>

      {/* Tarjeta de acción principal */}
      <TouchableOpacity 
        style={styles.mainCard} 
        activeOpacity={0.8}
        onPress={() => router.push('/mazos')} 
      >
        <Ionicons name="albums" size={40} color="white" />
        <View style={styles.mainCardText}>
          <ThemedText type="subtitle" style={{color: 'white'}}>Ir a mis Mazos</ThemedText>
          <ThemedText style={{color: 'rgba(255,255,255,0.7)', fontSize: 14}}>
            Crea, edita y estudia tus tarjetas
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={24} color="white" />
      </TouchableOpacity>

      <ThemedText type="subtitle" style={styles.sectionTitle}>¿Cómo funciona?</ThemedText>

      {/* Guía Paso a Paso */}
      <ThemedView style={styles.guideContainer}>
        <View style={styles.stepItem}>
          <View style={styles.iconContainer}>
            <Ionicons name="folder-open" size={24} color="#A1CEDC" />
          </View>
          <View style={styles.stepText}>
            <ThemedText type="defaultSemiBold">1. Crea un Mazo</ThemedText>
            <ThemedText style={styles.stepDescription}>
              Agrupa tus temas de estudio. Por ejemplo: "Inglés", "Historia" o "Biología".
            </ThemedText>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.iconContainer}>
            <Ionicons name="add-circle" size={24} color="#4CAF50" />
          </View>
          <View style={styles.stepText}>
            <ThemedText type="defaultSemiBold">2. Añade Flashcards</ThemedText>
            <ThemedText style={styles.stepDescription}>
              Escribe una pregunta en la parte frontal y la respuesta en la parte trasera.
            </ThemedText>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.iconContainer}>
            <Ionicons name="school" size={24} color="#FF9500" />
          </View>
          <View style={styles.stepText}>
            <ThemedText type="defaultSemiBold">3. Modo Estudio</ThemedText>
            <ThemedText style={styles.stepDescription}>
              Ponte a prueba. Lee la pregunta, intenta recordar la respuesta y toca para revelar.
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Tip del día */}
      <ThemedView style={styles.tipCard}>
        <Ionicons name="bulb" size={24} color="#FFCC00" style={{marginRight: 10}} />
        <ThemedText style={{flex: 1, fontSize: 14, opacity: 0.9}}>
          <ThemedText type="defaultSemiBold" style={{color: '#FFCC00'}}>Tip: </ThemedText>
          Estudiar en sesiones cortas (15-20 mins) es más efectivo que intentar memorizar todo de golpe.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

// ... (tus estilos se mantienen iguales)

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  welcomeSection: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  mainCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  mainCardText: {
    flex: 1,
    marginLeft: 15,
  },
  sectionTitle: {
    marginBottom: 20,
  },
  guideContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 25,
    alignItems: 'flex-start',
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepText: {
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 5,
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.3)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  }
});