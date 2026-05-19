import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { onAuthStateChanged } from 'firebase/auth';

export default function MazosScreen() {
  const [mazos, setMazos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editId, setEditId] = useState(null);
  const router = useRouter();
  const user = auth.currentUser;

  // HU7: Visualizar mazos en tiempo real
// HU7: Visualizar mazos en tiempo real de forma segura
  useEffect(() => {
    // 1. Esperamos a que Firebase nos confirme quién está logueado
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // 2. AHORA SÍ, con el usuario confirmado, buscamos sus mazos
        const q = query(collection(db, "Mazos"), where("userId", "==", currentUser.uid));
        
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMazos(lista);
        });

        // Limpieza del listener de Firestore
        return () => unsubscribeSnapshot();
      } else {
        setMazos([]); // Si se cierra sesión, vaciamos la lista
      }
    });

    // Limpieza del listener de Auth
    return () => unsubscribeAuth();
  }, []);

  // HU6 & HU8: Crear y Editar
  const guardarMazo = async () => {
    if (nuevoNombre.trim() === '') return;
    try {
      if (editId) {
        await updateDoc(doc(db, "Mazos", editId), { nombre: nuevoNombre });
      } else {
        await addDoc(collection(db, "Mazos"), {
          nombre: nuevoNombre,
          userId: user.uid,
          fechaCreacion: new Date()
        });
      }
      cerrarModal();
    } catch (e) { Alert.alert("Error", e.message); }
  };

  // HU9: Eliminar
  const eliminarMazo = (id) => {
    Alert.alert("Eliminar", "¿Seguro?", [
      { text: "No" },
      { text: "Sí", onPress: async () => await deleteDoc(doc(db, "Mazos", id)) }
    ]);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setNuevoNombre('');
    setEditId(null);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Mis Mazos</ThemedText>
      
      <FlatList
        data={mazos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.mazoCard} 
            onPress={() => router.push(`/mazo/${item.id}`)} // Navegar a las tarjetas
          >
            <ThemedText style={styles.mazoNombre}>{item.nombre}</ThemedText>
            <View style={styles.iconos}>
              <TouchableOpacity onPress={() => { setEditId(item.id); setNuevoNombre(item.nombre); setModalVisible(true); }}>
                <Ionicons name="pencil" size={20} color="#A1CEDC" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => eliminarMazo(item.id)}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <TextInput 
              placeholder="Nombre del mazo" 
              value={nuevoNombre} 
              onChangeText={setNuevoNombre}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.btnSave} onPress={guardarMazo}>
                <ThemedText>Guardar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={cerrarModal}>
                <ThemedText>Cancelar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { marginBottom: 20 },
  mazoCard: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  mazoNombre: { fontSize: 18, fontWeight: 'bold' },
  iconos: { flexDirection: 'row', gap: 15 },
  fab: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#A1CEDC', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { backgroundColor: '#1D3D47', padding: 30, borderRadius: 20, width: '80%', alignItems: 'center' },
  input: { backgroundColor: 'white', width: '100%', padding: 10, borderRadius: 8, marginBottom: 20 },
  btnSave: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8 },
  btnCancel: { backgroundColor: '#FF3B30', padding: 10, borderRadius: 8 }
});