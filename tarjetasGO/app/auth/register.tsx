import React, { useState } from 'react';
import { StyleSheet, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router'; 

import { auth, db } from '../../firebaseConfig'; // <-- IMPORTANTE: Agregar db aquí
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, runTransaction } from 'firebase/firestore'; // <-- Importar Firestore

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState(''); // <-- Añadido para guardar el nombre inicial
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

const handleRegister = async () => {
    if (!email || !password || !nombre) {
      Alert.alert("Atención", "Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      // 1. Crear el usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Referencias a Firestore
      const counterRef = doc(db, "Metadata", "contadores");
      const userRef = doc(db, "Usuarios", user.uid);

      // 3. Ejecutar la Transacción con Auto-Inicialización
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let newSqlId = 1; // Asumimos que es el primer usuario

        if (!counterDoc.exists()) {
          // Si el documento "contadores" no existe, lo inicializamos
          transaction.set(counterRef, { usuariosLastId: 1 });
        } else {
          // Si ya existe, leemos el último ID y le sumamos 1
          newSqlId = counterDoc.data().usuariosLastId + 1;
          transaction.update(counterRef, { usuariosLastId: newSqlId });
        }

        // Crear el documento del usuario con su nuevo ID secuencial
        transaction.set(userRef, {
          nombre: nombre,
          email: email,
          sqlId: newSqlId
        });
      });

      Alert.alert("¡Éxito!", "Cuenta creada correctamente.");
      router.replace('/(tabs)'); 

    } catch (error: any) {
      console.log("Error de registro:", error);
      
      switch (error.code) {
        case 'auth/weak-password':
          Alert.alert("Contraseña débil", "La contraseña debe tener al menos 6 caracteres.");
          break;
        case 'auth/email-already-in-use':
          Alert.alert("Correo ocupado", "Este correo ya está registrado con otra cuenta.");
          break;
        case 'auth/invalid-email':
          Alert.alert("Email inválido", "El formato del correo electrónico no es correcto.");
          break;
        case 'auth/network-request-failed':
          Alert.alert("Error de red", "Revisa tu conexión a internet e inténtalo de nuevo.");
          break;
        default:
          Alert.alert("Error", "No se pudo completar el registro. Inténtalo más tarde.");
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.authContainer}>
      <ThemedText type="title" style={{ marginBottom: 20 }}>Crear Cuenta</ThemedText>
      
      {/* Nuevo input para el nombre */}
      <TextInput 
        placeholder="Nombre de usuario" 
        value={nombre} 
        onChangeText={setNombre} 
        style={styles.input}
        placeholderTextColor="#888"
        autoCapitalize="words"
      />
      
      <TextInput 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail} 
        style={styles.input}
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput 
        placeholder="Contraseña" 
        value={password} 
        onChangeText={setPassword} 
        style={styles.input}
        placeholderTextColor="#888"
        secureTextEntry 
      />

      <ThemedView style={styles.buttonGap}>
        {loading ? (
          <ActivityIndicator size="small" color="#4CAF50" />
        ) : (
          <Button title="Registrarme" onPress={handleRegister} color="#4CAF50" />
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#121212', // Un fondo oscuro puro, muy moderno
  },
  input: {
    backgroundColor: '#1E1E1E', // Ligeramente más claro que el fondo para resaltar
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14, // Curvas más pronunciadas (estilo iOS/moderno)
    marginBottom: 20,
    color: '#FFFFFF', // Texto en blanco para contrastar
    fontSize: 16,
    letterSpacing: 0.5,
    borderWidth: 1.5,
    borderColor: '#2A2A2A', // Borde sutil que le da estructura
    // Sombras para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    // Sombra para Android
    elevation: 5, 
  },
  buttonGap: {
    marginTop: 24, // Un poco más de aire para que la interfaz respire
  },
});