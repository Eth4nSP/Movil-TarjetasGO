import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, View, TouchableOpacity, Share, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, collection, onSnapshot, query, orderBy, updateDoc, addDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

export default function LobbyScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [sesionData, setSesionData] = useState(null);
  const [participantes, setParticipantes] = useState([]);

  // Estados para creación de Tarjetas (Aportes)
  const [modalAporteVisible, setModalAporteVisible] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');

  // 1. Escuchar la sesión en tiempo real
  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, "sesiones", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSesionData(data);

        if (data.estado === "en_progreso") {
          router.replace({ pathname: '/sesion/estudio', params: { id: id } });
        }
      }
    });
    return () => unsubscribe();
  }, [id]);

  // 2. Escuchar a los participantes en tiempo real
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "sesiones", id, "participantes"), orderBy("unidoEn", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setParticipantes(lista);
    });
    return () => unsubscribe();
  }, [id]);

  const compartirEnlace = async () => {
    try {
      const urlInvitacion = Linking.createURL(`sesion/${id}`);
      await Share.share({
        message: `¡Únete a mi grupo en TarjetasGO para el mazo "${sesionData?.nombreMazo}"!\n\nEnlace: ${urlInvitacion}\nCódigo manual: ${sesionData?.codigoAcceso}`,
      });
    } catch (error) {
      console.log("Error al compartir", error);
    }
  };

  const iniciarEstudio = async () => {
    try {
      await updateDoc(doc(db, "sesiones", id), {
        estado: "en_progreso"
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo iniciar la sesión.");
    }
  };

  // Crear una tarjeta colaborativa (Aporte)
  const guardarAporte = async () => {
    if (!pregunta.trim() || !respuesta.trim()) {
      Alert.alert("Atención", "Escribe la pregunta y la respuesta.");
      return;
    }

    try {
      const flashcardsRef = collection(db, "Mazos", sesionData.mazoId, "Flashcards");
      await addDoc(flashcardsRef, {
        pregunta,
        respuesta,
        fecha: new Date(),
        aportadoPor: auth.currentUser?.displayName || "Usuario"
      });

      const participanteRef = doc(db, "sesiones", id, "participantes", auth.currentUser.uid);
      await updateDoc(participanteRef, {
        aportesContador: increment(1)
      });

      setModalAporteVisible(false);
      setPregunta('');
      setRespuesta('');
      Alert.alert("¡Aporte exitoso!", "Tarjeta añadida al mazo del grupo.");

    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la tarjeta.");
    }
  };

  if (!sesionData) return <ThemedView style={styles.center}><ActivityIndicator size="large" color="#A1CEDC" /></ThemedView>;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#A1CEDC" />
        </TouchableOpacity>
        <ThemedText type="title">Sala de Espera</ThemedText>
      </View>

      <View style={styles.infoBox}>
        <ThemedText style={{ opacity: 0.7 }}>Mazo Colaborativo:</ThemedText>
        <ThemedText type="subtitle" style={{ color: '#4CAF50', marginBottom: 10, textAlign: 'center' }}>{sesionData.nombreMazo}</ThemedText>
        <ThemedText style={{ opacity: 0.7 }}>Código de acceso:</ThemedText>
        <ThemedText style={styles.codigoText}>{sesionData.codigoAcceso}</ThemedText>
      </View>

      <View style={styles.botonesLobbyContainer}>
        <TouchableOpacity style={styles.btnShare} onPress={compartirEnlace}>
          <Ionicons name="share-social" size={20} color="white" />
          <ThemedText style={styles.textoBotonLobby}> COMPARTIR</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnAportar} onPress={() => setModalAporteVisible(true)}>
          <Ionicons name="add-circle" size={20} color="white" />
          <ThemedText style={styles.textoBotonLobby}> APORTAR TARJETA</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedText type="defaultSemiBold" style={styles.participantesTitle}>
        Participantes ({participantes.length})
      </ThemedText>

      <FlatList
        data={participantes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Ionicons name="person-circle" size={40} color="#A1CEDC" />
            <ThemedText style={styles.userName}>
              {item.nombre} {item.id === sesionData.creadorId ? "(Host)" : ""}
            </ThemedText>
            
            {/* Visualización doble: Muestra Aportes y Puntos acumulados */}
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: '#FF9500' }]}>
                <ThemedText style={styles.badgeText}>➕ {item.aportesContador || 0} apic</ThemedText>
              </View>
              <View style={[styles.badge, { backgroundColor: '#FFCC00' }]}>
                <ThemedText style={[styles.badgeText, { color: 'black' }]}>⭐ {item.puntosContador || 0} pts</ThemedText>
              </View>
            </View>
          </View>
        )}
      />

      {auth.currentUser?.uid === sesionData.creadorId ? (
        <TouchableOpacity style={styles.btnStart} onPress={iniciarEstudio}>
          <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>COMENZAR ESTUDIO</ThemedText>
        </TouchableOpacity>
      ) : (
        <ThemedText style={{ textAlign: 'center', marginTop: 15, opacity: 0.7, fontSize: 16 }}>
          Anfitrión iniciará la sesión pronto... ⏳
        </ThemedText>
      )}

      {/* Modal para aportar tarjeta */}
      <Modal visible={modalAporteVisible} transparent animationType="slide">
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <ThemedText type="subtitle" style={{marginBottom: 15}}>Aportar al Mazo</ThemedText>
            <TextInput placeholder="Pregunta" value={pregunta} onChangeText={setPregunta} style={styles.input} multiline placeholderTextColor="#888" />
            <TextInput placeholder="Respuesta" value={respuesta} onChangeText={setRespuesta} style={styles.input} multiline placeholderTextColor="#888" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.btnSave} onPress={guardarAporte}><ThemedText>Guardar</ThemedText></TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setModalAporteVisible(false); setPregunta(''); setRespuesta(''); }}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  infoBox: { backgroundColor: '#1D3D47', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  codigoText: { fontSize: 40, fontWeight: 'bold', letterSpacing: 5, color: '#fff' },
  botonesLobbyContainer: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  btnShare: { flex: 1, backgroundColor: '#6C5CE7', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnAportar: { flex: 1, backgroundColor: '#FF9500', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  textoBotonLobby: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  participantesTitle: { marginBottom: 15, fontSize: 18 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 10, marginBottom: 10 },
  userName: { flex: 1, marginLeft: 10, fontSize: 15 },
  badgesRow: { flexDirection: 'row', gap: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: 'white' },
  btnStart: { backgroundColor: '#4CAF50', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  modalCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { backgroundColor: '#1D3D47', padding: 25, borderRadius: 15, width: '85%' },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 15, color: 'black' },
  btnSave: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnCancel: { backgroundColor: '#FF3B30', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' }
});