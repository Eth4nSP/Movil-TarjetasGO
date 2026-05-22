import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal, View, Platform } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { onAuthStateChanged } from 'firebase/auth';

// Importamos la función desde la raíz para crear la sesión
import { crearSesionColaborativa } from '../../sesioneService'; 

export default function MazosScreen() {
  // Estados para la gestión de Mazos
  const [mazos, setMazos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editId, setEditId] = useState(null);
  
  // Estados para unirse a Sesiones Colaborativas
  const [modalUnirseVisible, setModalUnirseVisible] = useState(false);
  const [codigoIngresado, setCodigoIngresado] = useState('');

  const router = useRouter();

  // HU7: Visualizar mazos en tiempo real de forma segura
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const q = query(collection(db, "Mazos"), where("userId", "==", currentUser.uid));
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMazos(lista);
        });
        return () => unsubscribeSnapshot();
      } else {
        setMazos([]); 
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // HU6 & HU8: Crear y Editar Mazo
  const guardarMazo = async () => {
    if (nuevoNombre.trim() === '') return;
    try {
      if (editId) {
        await updateDoc(doc(db, "Mazos", editId), { nombre: nuevoNombre });
      } else {
        await addDoc(collection(db, "Mazos"), {
          nombre: nuevoNombre,
          userId: auth.currentUser.uid,
          fechaCreacion: new Date()
        });
      }
      cerrarModal();
    } catch (e) { Alert.alert("Error", e.message); }
  };

  // HU9: Eliminar Mazo (Con soporte Web/Móvil)
  const eliminarMazo = async (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm("¿Seguro que deseas eliminar este mazo?")) {
        await deleteDoc(doc(db, "Mazos", id));
      }
    } else {
      Alert.alert("Eliminar", "¿Seguro que deseas eliminar este mazo?", [
        { text: "No", style: "cancel" },
        { text: "Sí", style: "destructive", onPress: async () => await deleteDoc(doc(db, "Mazos", id)) }
      ]);
    }
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setNuevoNombre('');
    setEditId(null);
  };

  // HU17: Crear e Iniciar Sesión Colaborativa
  const handleIniciarGrupo = async (mazoId, nombreMazo) => {
    const sesionId = await crearSesionColaborativa(mazoId, nombreMazo);
    if (sesionId) {
      // Redirige al lobby pasándole el ID de la sesión recién creada
      router.push({ pathname: '/sesion/lobby', params: { id: sesionId } });
    }
  };

  // HU19: Unirse a una sesión mediante código manual
  const handleUnirseConCodigo = async () => {
    if (codigoIngresado.trim().length !== 6) {
      Alert.alert("Atención", "El código debe tener 6 dígitos.");
      return;
    }

    try {
      // Buscamos la sesión que coincida con el código
      const q = query(collection(db, "sesiones"), where("codigoAcceso", "==", codigoIngresado));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Error", "No se encontró ninguna sala con este código.");
        return;
      }

      // Extraemos el ID real de Firestore
      const sesionEncontrada = querySnapshot.docs[0];
      const sesionIdReal = sesionEncontrada.id;

      // Limpiamos modal y redirigimos al validador automático
      setModalUnirseVisible(false);
      setCodigoIngresado('');
      router.push({ pathname: '/sesion/[id]', params: { id: sesionIdReal } });

    } catch (error) {
      Alert.alert("Error", "Hubo un problema al buscar la sala.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Mis Mazos</ThemedText>

      {/* Botón para entrar a una sala con código */}
      <TouchableOpacity 
        style={styles.btnEntrarSala}
        onPress={() => setModalUnirseVisible(true)}
      >
        <Ionicons name="enter" size={20} color="white" />
        <ThemedText style={{ color: 'white', fontWeight: 'bold' }}> ENTRAR A SALA (CON CÓDIGO)</ThemedText>
      </TouchableOpacity>
      
      <FlatList
        data={mazos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.mazoCard} 
            onPress={() => router.push({ pathname: '/mazo/[id]', params: { id: item.id } })} 
          >
            <ThemedText style={styles.mazoNombre}>{item.nombre}</ThemedText>
            
            <View style={styles.iconos}>
              {/* Botón de Estudio Grupal */}
              <TouchableOpacity onPress={() => handleIniciarGrupo(item.id, item.nombre)}>
                <Ionicons name="people" size={24} color="#4CAF50" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setEditId(item.id); setNuevoNombre(item.nombre); setModalVisible(true); }}>
                <Ionicons name="pencil" size={20} color="#A1CEDC" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => eliminarMazo(item.id)}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <ThemedText style={{ textAlign: 'center', opacity: 0.5, marginTop: 20 }}>
            Aún no tienes mazos. Toca el botón + para crear uno.
          </ThemedText>
        }
      />

      {/* FAB para crear nuevo mazo */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Modal: Crear / Editar Mazo */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <ThemedText type="subtitle" style={{marginBottom: 15}}>
              {editId ? "Editar Mazo" : "Nuevo Mazo"}
            </ThemedText>
            <TextInput 
              placeholder="Nombre del mazo" 
              value={nuevoNombre} 
              onChangeText={setNuevoNombre}
              style={styles.input}
              placeholderTextColor="#888"
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

      {/* Modal: Unirse a Sala con Código */}
      <Modal visible={modalUnirseVisible} transparent animationType="fade">
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <ThemedText type="subtitle" style={{marginBottom: 15}}>Unirse a Grupo</ThemedText>
            <ThemedText style={{opacity: 0.7, marginBottom: 15, textAlign: 'center'}}>
              Ingresa el código de 6 dígitos que te compartió el anfitrión.
            </ThemedText>
            <TextInput 
              placeholder="Ej: 558719" 
              value={codigoIngresado} 
              onChangeText={setCodigoIngresado}
              style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 5 }]}
              keyboardType="numeric"
              maxLength={6}
              placeholderTextColor="#888"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.btnSave} onPress={handleUnirseConCodigo}>
                <ThemedText>Entrar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={() => {
                setModalUnirseVisible(false);
                setCodigoIngresado('');
              }}>
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
  btnEntrarSala: { 
    backgroundColor: '#6C5CE7', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20, 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  mazoCard: { 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  mazoNombre: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  iconos: { flexDirection: 'row', gap: 20, alignItems: 'center' }, 
  fab: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#A1CEDC', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { backgroundColor: '#1D3D47', padding: 30, borderRadius: 20, width: '85%', alignItems: 'center' },
  input: { backgroundColor: 'white', width: '100%', padding: 12, borderRadius: 8, marginBottom: 20, color: 'black' },
  btnSave: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnCancel: { backgroundColor: '#FF3B30', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' }
});
