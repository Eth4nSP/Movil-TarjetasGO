import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // <-- Importamos useRouter para redireccionar al salir

import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updateEmail, updatePassword, signOut } from 'firebase/auth'; // <-- Importamos funciones de actualización

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Añadimos newPassword al estado para manejar el cambio de contraseña
  const [newPassword, setNewPassword] = useState('');
  const [userData, setUserData] = useState({
    nombre: '',
    email: '',
    sqlId: '' // Mantenemos el ID secuencial si lo estabas usando
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserProfile(user.uid, user.email); 
      } else {
        setLoading(false);
        // Opcional: Redirigir al login si no hay usuario
        // router.replace('/auth/login'); 
      }
    });

    return unsubscribe;
  }, []);

  const fetchUserProfile = async (uid: string, authEmail: string | null) => {
    try {
      if (!db || !uid) return;

      const docRef = doc(db, "Usuarios", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({ 
          ...data, 
          email: data.email || authEmail || '' // Aseguramos que el correo cargue en el estado
        } as any);
      }
    } catch (error) {
      console.error("Error al cargar perfil en móvil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      // 1. Actualizar datos en Firestore (Nombre y Correo)
      const docRef = doc(db, "Usuarios", currentUser.uid);
      await updateDoc(docRef, {
        nombre: userData.nombre,
        email: userData.email,
      });

      // 2. Actualizar el correo en Firebase Auth (si fue modificado)
      if (userData.email !== currentUser.email) {
        await updateEmail(currentUser, userData.email);
      }

      // 3. Actualizar la contraseña en Firebase Auth (si el campo no está vacío)
      if (newPassword.trim().length > 0) {
        if (newPassword.length < 6) {
          Alert.alert("Atención", "La nueva contraseña debe tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }
        await updatePassword(currentUser, newPassword);
        setNewPassword(''); // Limpiamos el campo después de actualizar
      }

      setIsEditing(false);
      Alert.alert("¡Éxito!", "Tu perfil ha sido actualizado correctamente.");

    } catch (error: any) {
      console.error("Error al actualizar:", error);
      
      // Manejo del error de seguridad de Firebase
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          "Seguridad", 
          "Por motivos de seguridad, debes cerrar sesión y volver a ingresar para cambiar tu correo o contraseña."
        );
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert("Error", "El formato del correo no es válido.");
      } else {
        Alert.alert("Error", "No se pudo actualizar la información.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/login'); // Redirige a tu pantalla de login (ajusta la ruta según tu proyecto)
    } catch (error) {
      Alert.alert("Error", "No se pudo cerrar sesión.");
    }
  };

  if (loading && !isEditing) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#A1CEDC" />
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Mi Perfil</ThemedText>
        <TouchableOpacity onPress={() => isEditing ? handleUpdate() : setIsEditing(true)}>
          <Ionicons 
            name={isEditing ? "checkmark-circle" : "create-outline"} 
            size={28} 
            color={isEditing ? "#4CAF50" : "#A1CEDC"} 
          />
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.card}>
        
        {/* NOMBRE */}
        <ThemedText style={styles.label}>Nombre de usuario</ThemedText>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={userData.nombre}
            onChangeText={(text) => setUserData({ ...userData, nombre: text })}
            placeholder="Escribe tu nombre"
            placeholderTextColor="#888"
          />
        ) : (
          <ThemedText style={styles.value}>{userData.nombre || "Sin nombre"}</ThemedText>
        )}

        {/* CORREO ELECTRÓNICO */}
        <ThemedText style={styles.label}>Correo Electrónico</ThemedText>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={userData.email}
            onChangeText={(text) => setUserData({ ...userData, email: text })}
            placeholder="nuevo@correo.com"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : (
          <ThemedText style={styles.valueReadOnly}>{userData.email || currentUser?.email}</ThemedText>
        )}

        {/* CONTRASEÑA (Solo visible al editar) */}
        {isEditing && (
          <>
            <ThemedText style={[styles.label, { marginTop: 10 }]}>Nueva Contraseña</ThemedText>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Deja en blanco para no cambiarla"
              placeholderTextColor="#888"
              secureTextEntry
            />
          </>
        )}
        
        {/* ID DE USUARIO (Auth UID) */}
        {!isEditing && (
          <>
            <ThemedText style={styles.label}>ID de Usuario</ThemedText>
            <ThemedText style={[styles.valueReadOnly, { fontSize: 10 }]}>{currentUser?.uid}</ThemedText>
          </>
        )}

      </ThemedView>

      {/* BOTÓN CANCELAR */}
      {isEditing && (
        <TouchableOpacity style={styles.cancelButton} onPress={() => {
          setIsEditing(false);
          setNewPassword(''); // Limpiamos la contraseña si cancela
        }}>
          <ThemedText style={{ color: '#FF3B30', fontWeight: '600' }}>Cancelar edición</ThemedText>
        </TouchableOpacity>
      )}

      {/* BOTÓN CERRAR SESIÓN */}
      {!isEditing && (
        <ThemedView style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="white" />
            <ThemedText style={{ color: 'white', fontWeight: 'bold' }}> Cerrar Sesión</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 25, paddingTop: 60, paddingBottom: 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 30 
  },
  card: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)', 
    padding: 20,
    borderRadius: 15,
    gap: 15
  },
  label: { fontSize: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '500', color: '#fff' },
  valueReadOnly: { fontSize: 16, opacity: 0.5, color: '#fff' },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: '#A1CEDC',
    fontSize: 18,
    paddingVertical: 8,
    color: '#fff',
    marginBottom: 5
  },
  cancelButton: { marginTop: 25, alignItems: 'center', padding: 10 },
  footer: { marginTop: 40 },
  logoutButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});