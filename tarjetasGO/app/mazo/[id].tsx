import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal, View, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { db } from '../../firebaseConfig';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore'; // Importante: añadir getDoc
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const { width } = Dimensions.get('window');

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams(); // Captura el ID del mazo
  const router = useRouter();
  
  // Estados para HU10-HU13 (Gestión)
  const [nombreMazo, setNombreMazo] = useState('Cargando...'); // Estado para el nombre dinámico
  const [cards, setCards] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [editId, setEditId] = useState(null);

  // Estados para HU14-HU16 (Estudio)
  const [modoEstudio, setModoEstudio] = useState(false);
  const [indiceActual, setIndiceActual] = useState(0);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);

  // Efecto para obtener el nombre del mazo dinámicamente
  useEffect(() => {
    const obtenerInfoMazo = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "Mazos", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setNombreMazo(docSnap.data().nombre);
        } else {
          setNombreMazo("Mazo no encontrado");
        }
      } catch (error) {
        console.error("Error al obtener nombre del mazo:", error);
      }
    };

    obtenerInfoMazo();
  }, [id]);

  // HU11: Cargar flashcards de este mazo
  useEffect(() => {
    if (!id) return;
    const cardsRef = collection(db, "Mazos", id as string, "Flashcards");
    const q = query(cardsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCards(lista);
    });
    return unsubscribe;
  }, [id]);

  // HU10 & HU12: Crear y Editar
  const guardarCard = async () => {
    if (!pregunta.trim() || !respuesta.trim()) return;
    try {
      const cardsRef = collection(db, "Mazos", id as string, "Flashcards");
      if (editId) {
        await updateDoc(doc(db, "Mazos", id as string, "Flashcards", editId), {
          pregunta, respuesta
        });
      } else {
        await addDoc(cardsRef, { pregunta, respuesta, fecha: new Date() });
      }
      cerrarModal();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  // HU13: Eliminar
  const eliminarCard = (cardId: string) => {
    Alert.alert("Eliminar Tarjeta", "¿Estás seguro?", [
      { text: "Cancelar" },
      { text: "Eliminar", onPress: async () => await deleteDoc(doc(db, "Mazos", id as string, "Flashcards", cardId)) }
    ]);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setPregunta('');
    setRespuesta('');
    setEditId(null);
  };

  // --- RENDERIZADO MODO ESTUDIO (HU14, HU15, HU16) ---
  if (modoEstudio) {
    if (cards.length === 0) return <ThemedView style={styles.container}><ThemedText>No hay tarjetas.</ThemedText></ThemedView>;

    const tarjetaActual = cards[indiceActual];

    return (
      <ThemedView style={styles.containerEstudio}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setModoEstudio(false)}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        
        {/* Mostramos el nombre del mazo también en el modo estudio */}
        <ThemedText type="title" style={{ position: 'absolute', top: 55, left: 25, fontSize: 20 }}>
          {nombreMazo}
        </ThemedText>

        <ThemedText style={styles.progreso}>{indiceActual + 1} / {cards.length}</ThemedText>

        {/* HU15 & HU16: Mostrar una a la vez y revelar respuesta */}
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

        <View style={styles.controlesEstudio}>
          <TouchableOpacity 
            disabled={indiceActual === 0}
            onPress={() => { setIndiceActual(indiceActual - 1); setMostrarRespuesta(false); }}
          >
            <Ionicons name="arrow-back-circle" size={60} color={indiceActual === 0 ? "#555" : "#A1CEDC"} />
          </TouchableOpacity>

          <TouchableOpacity 
            disabled={indiceActual === cards.length - 1}
            onPress={() => { setIndiceActual(indiceActual + 1); setMostrarRespuesta(false); }}
          >
            <Ionicons name="arrow-forward-circle" size={60} color={indiceActual === cards.length - 1 ? "#555" : "#A1CEDC"} />
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  // --- RENDERIZADO GESTIÓN (HU11) ---
  return (
    <ThemedView style={styles.container}>
      {/* Ocultamos el header nativo de Expo Router */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#A1CEDC" />
        </TouchableOpacity>
        
        {/* Mostramos el nombre dinámico del mazo */}
        <ThemedText type="title" numberOfLines={1} style={{ flex: 1 }}>
          {nombreMazo}
        </ThemedText>
      </View>

      <TouchableOpacity 
        style={styles.btnEstudiar} 
        onPress={() => { if(cards.length > 0) setModoEstudio(true); else Alert.alert("Mazo vacío", "Crea tarjetas primero."); }}
      >
        <Ionicons name="play" size={20} color="white" />
        <ThemedText style={{color: 'white', fontWeight: 'bold'}}> INICIAR ESTUDIO</ThemedText>
      </TouchableOpacity>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardItem}>
            <View style={{flex: 1}}>
              <ThemedText style={styles.txtPregunta}>{item.pregunta}</ThemedText>
              <ThemedText style={styles.txtRespuesta}>{item.respuesta}</ThemedText>
            </View>
            <View style={styles.cardAcciones}>
              <TouchableOpacity onPress={() => { setEditId(item.id); setPregunta(item.pregunta); setRespuesta(item.respuesta); setModalVisible(true); }}>
                <Ionicons name="pencil" size={20} color="#A1CEDC" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => eliminarCard(item.id)}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Modal para HU10 & HU12 */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <ThemedText type="subtitle" style={{marginBottom: 15}}>Nueva Tarjeta</ThemedText>
            <TextInput placeholder="Pregunta" value={pregunta} onChangeText={setPregunta} style={styles.input} multiline />
            <TextInput placeholder="Respuesta" value={respuesta} onChangeText={setRespuesta} style={styles.input} multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.btnSave} onPress={guardarCard}><ThemedText>Guardar</ThemedText></TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={cerrarModal}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  btnEstudiar: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  cardItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  txtPregunta: { fontWeight: 'bold', fontSize: 16 },
  txtRespuesta: { opacity: 0.7, fontSize: 14 },
  cardAcciones: { flexDirection: 'row', gap: 15, marginLeft: 10 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#A1CEDC', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { backgroundColor: '#1D3D47', padding: 25, borderRadius: 15, width: '85%' },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 15, color: 'black' },
  btnSave: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnCancel: { backgroundColor: '#FF3B30', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  // Estilos Estudio
  containerEstudio: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', padding: 20 },
  backBtn: { position: 'absolute', top: 50, right: 25 },
  progreso: { position: 'absolute', top: 55, color: '#A1CEDC', fontSize: 18, fontWeight: 'bold' },
  flashcardGrande: { width: width * 0.85, height: 400, backgroundColor: '#1D3D47', borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 30, elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5 },
  labelCard: { position: 'absolute', top: 20, opacity: 0.5, letterSpacing: 2 },
  textoCard: { fontSize: 28, textAlign: 'center', color: 'white' },
  hint: { position: 'absolute', bottom: 20, fontSize: 12, opacity: 0.4 },
  controlesEstudio: { flexDirection: 'row', gap: 50, marginTop: 40 }
});