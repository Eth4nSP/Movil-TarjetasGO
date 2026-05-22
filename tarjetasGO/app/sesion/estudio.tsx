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
  const [indiceActual, setIndiceActual] = useState(0);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [esAnfitrion, setEsAnfitrion] = useState(false);

  // 1. Escuchar el ESTADO GLOBAL de la sesión
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, "sesiones", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.creadorId === auth.currentUser?.uid) {
          setEsAnfitrion(true);
        }

        if (data.estado === "esperando") {
          router.replace({ pathname: '/sesion/lobby', params: { id } });
        }
      }
    });

    return () => unsubscribe();
  }, [id]);

  // 2. Cargar las flashcards colaborativas del mazo
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

  // Incrementar puntos en Firebase cuando el usuario se sabe la respuesta
  const sumarPuntoEstudio = async () => {
    try {
      const userUid = auth.currentUser?.uid;
      if (!userUid) return;

      // Incrementa el contador exclusivo de puntos en juego
      const participanteRef = doc(db, "sesiones", id, "participantes", userUid);
      await updateDoc(participanteRef, {
        puntosContador: increment(1)
      });

      avanzarTarjeta();
    } catch (error) {
      console.error("Error al registrar puntos:", error);
    }
  };

  const avanzarTarjeta = () => {
    if (indiceActual < tarjetas.length - 1) {
      setIndiceActual(indiceActual + 1);
      setMostrarRespuesta(false);
    } else {
      if (esAnfitrion) {
        Alert.alert("¡Fin del mazo!", "Todos han terminado. ¿Deseas regresar la sala al Lobby?", [
          { text: "Sí, regresar a todos", onPress: volverAlLobbyGlobal }
        ]);
      } else {
        Alert.alert("¡Fin del mazo!", "Espera a que el anfitrión regrese a todos al Lobby.");
      }
    }
  };

  const volverAlLobbyGlobal = async () => {
    try {
      await updateDoc(doc(db, "sesiones", id), {
        estado: "esperando" 
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

  const tarjetaActual = tarjetas[indiceActual];

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
          Tarjeta {indiceActual + 1} de {tarjetas.length}
        </ThemedText>
        <View style={{ width: 30 }} /> 
      </View>

      <TouchableOpacity 
        style={styles.flashcardGrande} 
        onPress={() => setMostrarRespuesta(!mostrarRespuesta)}
        activeOpacity={0.8}
      >
        <ThemedText type="defaultSemiBold" style={styles.labelCard}>
          {mostrarRespuesta ? "RESPUESTA" : "PREGUNTA"}
        </ThemedText>
        <ThemedText style={styles.textoCard}>
          {mostrarRespuesta ? tarjetaActual.respuesta : tarjetaActual.pregunta}
        </ThemedText>
        <ThemedText style={styles.hint}>Toca para voltear</ThemedText>
      </TouchableOpacity>

      {mostrarRespuesta ? (
        <View style={styles.botonesContainer}>
          <TouchableOpacity style={[styles.btnAccion, { backgroundColor: '#FF3B30' }]} onPress={avanzarTarjeta}>
            <Ionicons name="close-circle" size={24} color="white" />
            <ThemedText style={styles.btnText}>No lo sabía</ThemedText>
          </TouchableOpacity>
          
          {/* Al presionar que sí lo sabía, llama a sumar el punto en Firebase */}
          <TouchableOpacity style={[styles.btnAccion, { backgroundColor: '#4CAF50' }]} onPress={sumarPuntoEstudio}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <ThemedText style={styles.btnText}>¡La sabía!</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <ThemedText style={{ marginTop: 40, opacity: 0.5, textAlign: 'center' }}>
          Piensa en la respuesta y toca la tarjeta para comprobar.
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
  labelCard: { position: 'absolute', top: 20, opacity: 0.5, letterSpacing: 2 },
  textoCard: { fontSize: 28, textAlign: 'center', color: 'white' },
  hint: { position: 'absolute', bottom: 20, fontSize: 12, opacity: 0.4 },
  botonesContainer: { flexDirection: 'row', gap: 20, marginTop: 40, width: width * 0.85 },
  btnAccion: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, gap: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnVolver: { backgroundColor: '#6C5CE7', padding: 15, borderRadius: 10, marginTop: 20 }
});