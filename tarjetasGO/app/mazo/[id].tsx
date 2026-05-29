import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal, View, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { db, auth } from '../../firebaseConfig'; 
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, arrayRemove } from 'firebase/firestore'; // <-- Importamos arrayRemove
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const { width } = Dimensions.get('window');

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [mazo, setMazo] = useState(null); 
  const [nombreMazo, setNombreMazo] = useState('Cargando...'); 
  const [cards, setCards] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [editId, setEditId] = useState(null);

  const [modoEstudio, setModoEstudio] = useState(false);
  const [indiceActual, setIndiceActual] = useState(0);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);

  // Estados para Administrar Colaboradores
  const [modalColabsVisible, setModalColabsVisible] = useState(false);
  const [colaboradoresInfo, setColaboradoresInfo] = useState([]);
  const [cargandoColabs, setCargandoColabs] = useState(false);

  const currentUserUid = auth.currentUser?.uid;

  // Cargar info del mazo
  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, "Mazos", id as string);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setMazo(docSnap.data());
        setNombreMazo(docSnap.data().nombre);
      } else {
        setNombreMazo("Mazo no encontrado");
      }
    });
    return () => unsubscribe();
  }, [id]);

  // Cargar flashcards
  useEffect(() => {
    if (!id) return;
    const cardsRef = collection(db, "Mazos", id as string, "Flashcards");
    const unsubscribe = onSnapshot(query(cardsRef), (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCards(lista);
    });
    return unsubscribe;
  }, [id]);

  const META_APORTES = 5; 
  const esDueño = mazo?.userId === currentUserUid;
  const misAportesCount = cards.filter(card => card.userId === currentUserUid).length;
  const cumplioMeta = misAportesCount >= META_APORTES;
  const estaBloqueado = !esDueño && !cumplioMeta;

  const tarjetasVisibles = estaBloqueado 
    ? cards.filter(card => card.userId === currentUserUid) 
    : cards;

  const guardarCard = async () => {
    if (!pregunta.trim() || !respuesta.trim()) return;
    try {
      const cardsRef = collection(db, "Mazos", id as string, "Flashcards");
      if (editId) {
        await updateDoc(doc(db, "Mazos", id as string, "Flashcards", editId), { pregunta, respuesta });
      } else {
        await addDoc(cardsRef, { 
          pregunta, 
          respuesta, 
          fecha: new Date(),
          userId: currentUserUid, 
          aportadoPor: auth.currentUser?.displayName || "Usuario"
        });

        if (!cumplioMeta && misAportesCount + 1 === META_APORTES) {
          Alert.alert("¡Felicidades! 🎉", "Has alcanzado la meta de 5 aportes. El mazo grupal ha sido desbloqueado para ti.");
        }
      }
      cerrarModal();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const eliminarCard = (cardId: string) => {
    Alert.alert("Eliminar", "¿Seguro que quieres borrar esta tarjeta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí", style: "destructive", onPress: async () => await deleteDoc(doc(db, "Mazos", id as string, "Flashcards", cardId)) }
    ]);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setPregunta('');
    setRespuesta('');
    setEditId(null);
  };

  // 🔥 NUEVO: Función para ver y expulsar colaboradores
  const abrirGestorColaboradores = async () => {
    if (!mazo?.colaboradores || mazo.colaboradores.length === 0) {
      Alert.alert("Sin invitados", "Aún no hay otras personas en este mazo.");
      return;
    }
    
    setModalColabsVisible(true);
    setCargandoColabs(true);
    
    try {
      const infoLista = [];
      for (const uid of mazo.colaboradores) {
        const userSnap = await getDoc(doc(db, "Usuarios", uid));
        if (userSnap.exists()) {
          infoLista.push({ uid, nombre: userSnap.data().nombre, email: userSnap.data().email });
        } else {
          infoLista.push({ uid, nombre: "Usuario Desconocido", email: "" });
        }
      }
      setColaboradoresInfo(infoLista);
    } catch (error) {
      console.error("Error al cargar colaboradores:", error);
    } finally {
      setCargandoColabs(false);
    }
  };

  const expulsarUsuario = async (uid, nombre) => {
    Alert.alert("Expulsar", `¿Seguro que deseas expulsar a ${nombre}? Perderá el acceso a este mazo.`, [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sí, Expulsar", 
        style: "destructive", 
        onPress: async () => {
          try {
            await updateDoc(doc(db, "Mazos", id as string), {
              colaboradores: arrayRemove(uid) // Lo elimina del arreglo en Firebase
            });
            // Lo quitamos de la lista visual
            setColaboradoresInfo(prev => prev.filter(c => c.uid !== uid));
            Alert.alert("Éxito", `${nombre} ha sido expulsado del mazo.`);
            if (colaboradoresInfo.length === 1) setModalColabsVisible(false); // Cierra si era el último
          } catch (error) {
            Alert.alert("Error", "No se pudo expulsar al usuario.");
          }
        } 
      }
    ]);
  };

  if (modoEstudio) {
    if (tarjetasVisibles.length === 0) return <ThemedView style={styles.container}><ThemedText>No hay tarjetas.</ThemedText></ThemedView>;
    const tarjetaActual = tarjetasVisibles[indiceActual];

    return (
      <ThemedView style={styles.containerEstudio}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setModoEstudio(false)}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        
        <ThemedText type="title" style={{ position: 'absolute', top: 55, left: 25, fontSize: 20 }}>{nombreMazo}</ThemedText>
        <ThemedText style={styles.progreso}>{indiceActual + 1} / {tarjetasVisibles.length}</ThemedText>

        <TouchableOpacity style={styles.flashcardGrande} onPress={() => setMostrarRespuesta(!mostrarRespuesta)} activeOpacity={0.8}>
          <ThemedText type="defaultSemiBold" style={styles.labelCard}>{mostrarRespuesta ? "RESPUESTA" : "PREGUNTA"}</ThemedText>
          <ThemedText style={styles.textoCard}>{mostrarRespuesta ? tarjetaActual.respuesta : tarjetaActual.pregunta}</ThemedText>
          <ThemedText style={styles.hint}>Toca para voltear</ThemedText>
        </TouchableOpacity>

        <View style={styles.controlesEstudio}>
          <TouchableOpacity disabled={indiceActual === 0} onPress={() => { setIndiceActual(indiceActual - 1); setMostrarRespuesta(false); }}>
            <Ionicons name="arrow-back-circle" size={60} color={indiceActual === 0 ? "#555" : "#A1CEDC"} />
          </TouchableOpacity>
          <TouchableOpacity disabled={indiceActual === tarjetasVisibles.length - 1} onPress={() => { setIndiceActual(indiceActual + 1); setMostrarRespuesta(false); }}>
            <Ionicons name="arrow-forward-circle" size={60} color={indiceActual === tarjetasVisibles.length - 1 ? "#555" : "#A1CEDC"} />
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#A1CEDC" />
        </TouchableOpacity>
        <ThemedText type="title" numberOfLines={1} style={{ flex: 1 }}>{nombreMazo}</ThemedText>
        
        {/* Botón de Administración de Grupo (Solo visible para el dueño si hay invitados) */}
        {esDueño && mazo?.colaboradores?.length > 0 && (
          <TouchableOpacity onPress={abrirGestorColaboradores} style={{ marginLeft: 10 }}>
            <Ionicons name="people-circle" size={32} color="#FFCC00" />
          </TouchableOpacity>
        )}
      </View>

      {estaBloqueado && (
        <View style={styles.bloqueoContainer}>
          <Ionicons name="lock-closed" size={30} color="#FF3B30" />
          <ThemedText style={styles.bloqueoTitulo}>Mazo Restringido</ThemedText>
          <ThemedText style={styles.bloqueoTexto}>Debes aportar tarjetas para poder estudiar con el grupo. ¡Añade flashcards usando el botón +!</ThemedText>
          <View style={styles.progresoBox}>
            <ThemedText style={styles.progresoTexto}>Progreso: {misAportesCount} / {META_APORTES}</ThemedText>
          </View>
        </View>
      )}

      {!estaBloqueado && (
        <TouchableOpacity style={styles.btnEstudiar} onPress={() => { if(tarjetasVisibles.length > 0) setModoEstudio(true); else Alert.alert("Mazo vacío", "Crea tarjetas primero."); }}>
          <Ionicons name="play" size={20} color="white" />
          <ThemedText style={{color: 'white', fontWeight: 'bold'}}> INICIAR ESTUDIO</ThemedText>
        </TouchableOpacity>
      )}

      <FlatList
        data={tarjetasVisibles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardItem}>
            <View style={{flex: 1}}>
              <ThemedText style={styles.txtPregunta}>{item.pregunta}</ThemedText>
              <ThemedText style={styles.txtRespuesta}>{item.respuesta}</ThemedText>
              {item.aportadoPor && <ThemedText style={styles.aportadorTexto}>Aporte de: {item.aportadoPor}</ThemedText>}
            </View>
            
            {(esDueño || item.userId === currentUserUid) && (
              <View style={styles.cardAcciones}>
                <TouchableOpacity onPress={() => { setEditId(item.id); setPregunta(item.pregunta); setRespuesta(item.respuesta); setModalVisible(true); }}>
                  <Ionicons name="pencil" size={20} color="#A1CEDC" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => eliminarCard(item.id)}>
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Modal: Crear / Editar */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <ThemedText type="subtitle" style={{marginBottom: 15}}>{editId ? "Editar Tarjeta" : "Nueva Tarjeta"}</ThemedText>
            {estaBloqueado && !editId && (
              <ThemedText style={{ opacity: 0.7, marginBottom: 15, fontSize: 12, textAlign: 'center' }}>Al guardar, estarás sumando 1 aporte a la meta.</ThemedText>
            )}
            <TextInput placeholder="Pregunta" value={pregunta} onChangeText={setPregunta} style={styles.input} multiline />
            <TextInput placeholder="Respuesta" value={respuesta} onChangeText={setRespuesta} style={styles.input} multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.btnSave} onPress={guardarCard}><ThemedText>Guardar</ThemedText></TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={cerrarModal}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Administrar Colaboradores */}
      <Modal visible={modalColabsVisible} transparent animationType="slide">
        <View style={styles.modalCentered}>
          <View style={[styles.modalView, { width: '90%', maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 }}>
              <ThemedText type="subtitle">Integrantes del Mazo</ThemedText>
              <TouchableOpacity onPress={() => setModalColabsVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            {cargandoColabs ? (
              <ActivityIndicator size="large" color="#A1CEDC" style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={colaboradoresInfo}
                keyExtractor={(item) => item.uid}
                style={{ width: '100%' }}
                renderItem={({ item }) => (
                  <View style={styles.colabItem}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: 'bold' }}>{item.nombre}</ThemedText>
                      <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>{item.email}</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => expulsarUsuario(item.uid, item.nombre)} style={styles.btnExpulsar}>
                      <Ionicons name="person-remove" size={18} color="white" />
                      <ThemedText style={{ color: 'white', fontSize: 12, fontWeight: 'bold', marginLeft: 5 }}>Expulsar</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  bloqueoContainer: { backgroundColor: 'rgba(255, 59, 48, 0.15)', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)' },
  bloqueoTitulo: { color: '#FF3B30', fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  bloqueoTexto: { textAlign: 'center', color: '#fff', opacity: 0.8, marginBottom: 15, fontSize: 14 },
  progresoBox: { backgroundColor: '#FF3B30', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  progresoTexto: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  btnEstudiar: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  cardItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  txtPregunta: { fontWeight: 'bold', fontSize: 16 },
  txtRespuesta: { opacity: 0.7, fontSize: 14 },
  aportadorTexto: { fontSize: 11, color: '#FFCC00', marginTop: 5, fontWeight: 'bold' },
  cardAcciones: { flexDirection: 'row', gap: 15, marginLeft: 10 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#A1CEDC', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  
  // Modals
  modalCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { backgroundColor: '#1D3D47', padding: 25, borderRadius: 15, width: '85%' },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 15, color: 'black' },
  btnSave: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnCancel: { backgroundColor: '#FF3B30', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  
  // Modal Colaboradores
  colabItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 15, borderRadius: 10, marginBottom: 10, width: '100%' },
  btnExpulsar: { flexDirection: 'row', backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },

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