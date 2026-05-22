import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { onAuthStateChanged } from 'firebase/auth';

export default function UnirseSesionScreen() {
  const { id } = useLocalSearchParams(); // Captura el ID de Firebase desde la URL
  const router = useRouter();
  const [mensaje, setMensaje] = useState("Verificando invitación...");

  useEffect(() => {
    // 1. Primero aseguramos que haya un usuario logueado
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        Alert.alert("Atención", "Debes iniciar sesión para unirte a un grupo.");
        router.replace('../../auth/login');
        return;
      }

      if (!id) return;

      try {
        setMensaje("Conectando con la sala...");
        const sesionRef = doc(db, "sesiones", id);
        const sesionSnap = await getDoc(sesionRef);

        // 2. Validar que la sesión exista
        if (!sesionSnap.exists()) {
          Alert.alert("Error", "Esta sesión no existe o ya fue cerrada.");
          router.replace('/(tabs)/mazos');
          return;
        }

        const datosSesion = sesionSnap.data();

        // 3. Validar expiración
        const ahora = new Date();
        const expiracion = datosSesion.expiraEn.toDate();
        if (ahora > expiracion) {
          Alert.alert("Enlace Expirado", "El tiempo para unirse a esta sala ha terminado.");
          router.replace('/(tabs)/mazos');
          return;
        }

        // 4. Buscamos el nombre real del invitado en Firestore
        setMensaje("Buscando tu perfil...");
        const userDocRef = doc(db, "Usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const nombreReal = userDocSnap.exists() ? userDocSnap.data().nombre : "Estudiante Invitado";

        // 5. Registrar al usuario en la subcolección 'participantes'
        setMensaje("Registrando tu entrada...");
        const participanteRef = doc(db, "sesiones", id, "participantes", user.uid);
        
        await setDoc(participanteRef, {
          nombre: nombreReal,
          unidoEn: serverTimestamp(),
          aportesContador: 0
        }, { merge: true }); // Usamos merge por si el usuario se sale y vuelve a entrar

        // 6. ¡Éxito! Lo mandamos al Lobby
        router.replace({ pathname: '/sesion/lobby', params: { id: id } });

      } catch (error) {
        console.error("Error al unirse:", error);
        Alert.alert("Error", "Hubo un problema de conexión.");
        router.replace('/(tabs)/mazos');
      }
    });

    return () => unsubscribe();
  }, [id]);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color="#A1CEDC" style={{ marginBottom: 20 }} />
      <ThemedText type="subtitle">{mensaje}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }
});