import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, getDocs, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function EstudioColaborativoScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();

  const [tarjetas, setTarjetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [esAnfitrion, setEsAnfitrion] = useState(false);

  // Estados Globales (Sincronizados con Firebase)
  const [indiceGlobal, setIndiceGlobal] = useState(0);

  // Estados Locales (Dinámicos por tarjeta)
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(10);
  const [yaRespondio, setYaRespondio] = useState(false); // Evita que sumen puntos varias veces

  // 1. Escuchar el ESTADO GLOBAL de la sesión (Incluyendo el índice de la tarjeta)
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, "sesiones", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.creadorId === auth.currentUser?.uid) {
          setEsAnfitrion(true);
        }

        // Sincronizar el índice actual para todos
        if (data.indiceActual !== undefined && data.indiceActual !== indiceGlobal) {
          setIndiceGlobal(data.indiceActual);
        }

        // Si el estado vuelve a "esperando", TODOS saltan al lobby
        if (data.estado === "esperando") {
          router.replace({ pathname: '/sesion/lobby', params: { id } });
        }
      }
    });

    return () => unsubscribe();
  }, [id, indiceGlobal]);

  // 2. Efecto para reiniciar los estados cada vez que cambian de tarjeta globalmente
  useEffect(() => {
    setMostrarRespuesta(false);
    setTiempoRestante(10);
    setYaRespondio(false);
  }, [indiceGlobal]);

  // 3. Efecto del Temporizador (Cuenta regresiva de 10 a 0)
  useEffect(() => {
    // Si ya se mostró la respuesta o no hay tarjetas, pausamos el timer
    if (mostrarRespuesta || tarjetas.length === 0) return;

    if (tiempoRestante === 0) {
      setMostrarRespuesta(true); // Revela la respuesta automáticamente
      return;
    }

    const timer = setInterval(() => {
      setTiempoRestante((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [tiempoRestante, mostrarRespuesta, tarjetas.length]);

  // 4. Cargar las flashcards colaborativas del mazo
  useEffect(() => {
    const fetchTarjetas = async () => {
      if (!id) return;
      try {
        const sesionRef = doc(db, "sesiones", id);
        const sesionSnap = await getDoc(sesionRef);
        
        if (sesionSnap.exists()) {
          const mazoId = sesionSnap.data().mazoId;
          
          const tarjetasRef = collection(db, "Mazos", mazoId, "Flashcards");
          const tarjetasSnap = await getDocs(tarjetasRef);
          const listaTarjetas = tarjetasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          setTarjetas(listaTarjetas);
        }
      } catch (error) {
        console.error("Error al cargar tarjetas:", error);
      } finally {
        setCargando(false);
      }
    };
    fetchTarjetas();
  }, [id]);

  // Registrar respuesta del usuario
  const manejarRespuesta = async (acierto) => {
    setYaRespondio(true); // Bloquea los botones para este usuario

    if (acierto) {
      try {
        const userUid = auth.currentUser?.uid;
        if (!userUid) return;

        const participanteRef = doc(db, "sesiones", id, "participantes", userUid);
        await updateDoc(participanteRef, {
          puntosContador: increment(1)
        });
      } catch (error) {
        console.error("Error al registrar puntos:", error);
      }
    }
  };

  // Función exclusiva del Anfitrión: Cambiar la tarjeta para TODOS
  const avanzarTarjetaGlobal = async () => {
    if (indiceGlobal < tarjetas.length - 1) {
      try {
        await updateDoc(doc(db, "sesiones", id), {
          indiceActual: increment(1) // Avanza el índice en Firebase
        });
      } catch (error) {
        Alert.alert("Error", "No se pudo avanzar a la siguiente tarjeta.");
      }
    } else {
      Alert.alert("¡Fin del mazo!", "¿Deseas regresar la sala al Lobby?", [
        { text: "Sí, regresar a todos", onPress: volverAlLobbyGlobal }
      ]);
    }
  };

  const volverAlLobbyGlobal = async () => {
    try {
      // Reiniciamos el índice a 0 para la próxima vez y cambiamos el estado
      await updateDoc(doc(db, "sesiones", id), {
        estado: "esperando",
        indiceActual: 0 
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo regresar al lobby.");
    }
  };

  if (cargando) {
    return <ThemedView style={styles.center}><ActivityIndicator size="large" color="#A1CEDC" /></ThemedView>;
  }

  if (tarjetas.length === 0) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={{ marginBottom: 20 }}>Este mazo no tiene tarjetas aún.</ThemedText>
        {esAnfitrion && (
          <TouchableOpacity style={styles.btnVolver} onPress={volverAlLobbyGlobal}>
            <ThemedText style={{ color: 'white' }}>Volver al Lobby</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  }

  const tarjetaActual = tarjetas[indiceGlobal];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        {esAnfitrion ? (
          <TouchableOpacity onPress={() => {
            Alert.alert("Terminar sesión", "¿Seguro que quieres regresar a todos al Lobby?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Sí", onPress: volverAlLobbyGlobal }
            ]);
          }}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 30 }} /> 
        )}

        <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>
          Tarjeta {indiceGlobal + 1} de {tarjetas.length}
        </ThemedText>
        <View style={{ width: 30 }} /> 
      </View>

      <View style={styles.flashcardGrande}>
        {/* Temporizador Visual */}
        {!mostrarRespuesta && (
          <View style={styles.timerContainer}>
            <Ionicons name="timer-outline" size={24} color="#FF9500" />
            <ThemedText style={styles.timerText}>{tiempoRestante}s</ThemedText>
          </View>
        )}

        <ThemedText type="defaultSemiBold" style={styles.labelCard}>
          {mostrarRespuesta ? "RESPUESTA" : "PREGUNTA"}
        </ThemedText>
        <ThemedText style={styles.textoCard}>
          {mostrarRespuesta ? tarjetaActual.respuesta : tarjetaActual.pregunta}
        </ThemedText>
      </View>

      {/* Acciones después de mostrar la respuesta */}
      {mostrarRespuesta ? (
        <View style={styles.accionesContainer}>
          
          {/* Botones de calificación individual (Desaparecen al votar) */}
          {!yaRespondio ? (
            <View style={styles.botonesVotacion}>
              <TouchableOpacity style={[styles.btnAccion, { backgroundColor: '#FF3B30' }]} onPress={() => manejarRespuesta(false)}>
                <Ionicons name="close-circle" size={24} color="white" />
                <ThemedText style={styles.btnText}>No lo sabía</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btnAccion, { backgroundColor: '#4CAF50' }]} onPress={() => manejarRespuesta(true)}>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <ThemedText style={styles.btnText}>¡La sabía!</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <ThemedText style={{ opacity: 0.7, marginBottom: 20, textAlign: 'center', fontSize: 16 }}>
              ✅ Respuesta registrada. Esperando...
            </ThemedText>
          )}

          {/* Botón de control EXCLUSIVO para el anfitrión */}
          {esAnfitrion && (
            <TouchableOpacity style={styles.btnAnfitrionNext} onPress={avanzarTarjetaGlobal}>
              <ThemedText style={styles.btnText}>
                {indiceGlobal < tarjetas.length - 1 ? "Siguiente Tarjeta ➡️" : "Finalizar Mazo 🏁"}
              </ThemedText>
            </TouchableOpacity>
          )}

        </View>
      ) : (
        <ThemedText style={{ marginTop: 40, opacity: 0.5, textAlign: 'center' }}>
          La respuesta se revelará en {tiempoRestante} segundos...
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center', padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', width: '100%', alignItems: 'center', marginBottom: 40 },
  flashcardGrande: { 
    width: width * 0.85, 
    height: 400, 
    backgroundColor: '#1D3D47', 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 30, 
    elevation: 10, 
    shadowColor: '#000', 
    shadowOffset: {width: 0, height: 4}, 
    shadowOpacity: 0.3, 
    shadowRadius: 5 
  },
  timerContainer: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255, 149, 0, 0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  timerText: { color: '#FF9500', fontWeight: 'bold', fontSize: 16 },
  labelCard: { position: 'absolute', top: 20, opacity: 0.5, letterSpacing: 2 },
  textoCard: { fontSize: 28, textAlign: 'center', color: 'white' },
  accionesContainer: { marginTop: 40, width: width * 0.85, alignItems: 'center' },
  botonesVotacion: { flexDirection: 'row', gap: 20, width: '100%', marginBottom: 20 },
  btnAccion: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, gap: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnAnfitrionNext: { backgroundColor: '#6C5CE7', padding: 18, borderRadius: 12, width: '100%', alignItems: 'center', elevation: 5 },
  btnVolver: { backgroundColor: '#6C5CE7', padding: 15, borderRadius: 10, marginTop: 20 }
});