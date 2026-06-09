import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updateEmail, updatePassword, signOut } from 'firebase/auth';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [userData, setUserData] = useState({
    nombre: '',
    email: '',
    sqlId: ''
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserProfile(user.uid, user.email);
      } else {
        setLoading(false);
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
        setUserData({ ...data, email: data.email || authEmail || '' } as any);
      }
    } catch (error) {
      console.error("Error al cargar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const docRef = doc(db, "Usuarios", currentUser.uid);
      await updateDoc(docRef, { nombre: userData.nombre, email: userData.email });

      if (userData.email !== currentUser.email) {
        await updateEmail(currentUser, userData.email);
      }
      if (newPassword.trim().length > 0) {
        if (newPassword.length < 6) {
          Alert.alert("Atención", "La nueva contraseña debe tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }
        await updatePassword(currentUser, newPassword);
        setNewPassword('');
      }
      setIsEditing(false);
      Alert.alert("¡Éxito!", "Tu perfil ha sido actualizado correctamente.");
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert("Seguridad", "Debes cerrar sesión y volver a ingresar para cambiar tu correo o contraseña.");
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
      router.replace('/auth/login');
    } catch (error) {
      Alert.alert("Error", "No se pudo cerrar sesión.");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading && !isEditing) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color="#4db6ac" />
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scrollBackground}>

      {/* HEADER */}
      <ThemedView style={styles.header}>
        <ThemedText style={styles.titleText}>Mi Perfil</ThemedText>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => isEditing ? handleUpdate() : setIsEditing(true)}
        >
          <Ionicons
            name={isEditing ? "checkmark-circle" : "create-outline"}
            size={24}
            color={isEditing ? "#4db6ac" : "#64b5f6"}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* AVATAR */}
      <ThemedView style={styles.avatarContainer}>
        <ThemedView style={styles.avatar}>
          <ThemedText style={styles.avatarText}>
            {getInitials(userData.nombre)}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* CARD */}
      <ThemedView style={styles.card}>

        <ThemedText style={styles.label}>Nombre de usuario</ThemedText>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={userData.nombre}
            onChangeText={(text) => setUserData({ ...userData, nombre: text })}
            placeholder="Escribe tu nombre"
            placeholderTextColor="#a8d5d1"
          />
        ) : (
          <ThemedText style={styles.value}>{userData.nombre || "Sin nombre"}</ThemedText>
        )}

        <ThemedView style={styles.divider} />

        <ThemedText style={styles.label}>Correo Electrónico</ThemedText>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={userData.email}
            onChangeText={(text) => setUserData({ ...userData, email: text })}
            placeholder="nuevo@correo.com"
            placeholderTextColor="#a8d5d1"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : (
          <ThemedText style={styles.valueReadOnly}>{userData.email || currentUser?.email}</ThemedText>
        )}

        {isEditing && (
          <>
            <ThemedView style={styles.divider} />
            <ThemedText style={styles.label}>Nueva Contraseña</ThemedText>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Deja en blanco para no cambiarla"
              placeholderTextColor="#a8d5d1"
              secureTextEntry
            />
          </>
        )}

        {!isEditing && (
          <>
            <ThemedView style={styles.divider} />
            <ThemedText style={styles.label}>ID de Usuario</ThemedText>
            <ThemedText style={styles.valueSmall}>{currentUser?.uid}</ThemedText>
          </>
        )}

      </ThemedView>

      {/* CANCELAR */}
      {isEditing && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => { setIsEditing(false); setNewPassword(''); }}
        >
          <ThemedText style={styles.cancelText}>Cancelar edición</ThemedText>
        </TouchableOpacity>
      )}

      {/* CERRAR SESIÓN */}
      {!isEditing && (
        <ThemedView style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="white" />
            <ThemedText style={styles.logoutText}> Cerrar Sesión</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollBackground: {
    backgroundColor: '#e0f2f1',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
  },
  container: {
    padding: 25,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: '#e3f2fd', // azul muy suave hacia abajo
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  titleText: {
    fontSize: 26,
    fontWeight: '500',
    color: '#1a5c52',
  },
  iconButton: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4db6ac',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#80cbc4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#4db6ac',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#1a5c52',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 22,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#4db6ac',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0f2f1',
  },
  label: {
    fontSize: 11,
    color: '#4db6ac',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  value: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1a5c52',
  },
  valueReadOnly: {
    fontSize: 15,
    color: '#90b8b4',
  },
  valueSmall: {
    fontSize: 10,
    color: '#90b8b4',
  },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: '#80cbc4',
    fontSize: 17,
    paddingVertical: 8,
    color: '#1a5c52',
    marginBottom: 4,
  },
  cancelButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    color: '#64b5f6',
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    marginTop: 32,
    backgroundColor: 'transparent',
  },
  logoutButton: {
    backgroundColor: '#4db6ac',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00897b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});