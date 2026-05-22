import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Alert } from 'react-native';

export const crearSesionColaborativa = async(mazoId, nombreMazo) => {
    const usuarioActual = auth.currentUser;

    if (!usuarioActual) {
        Alert.alert("Atención", "Debes iniciar sesión para crear una sesión de estudio.");
        return null;
    }

    // Generamos un código numérico corto de 6 dígitos
    const codigoCorto = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        // Buscamos el nombre real del usuario en la colección "Usuarios"
        const userDocRef = doc(db, "Usuarios", usuarioActual.uid);
        const userDocSnap = await getDoc(userDocRef);
        const nombreReal = userDocSnap.exists() ? userDocSnap.data().nombre : "Anfitrión";

        // 1. Creamos el documento de la sesión
        const sesionRef = await addDoc(collection(db, "sesiones"), {
            creadorId: usuarioActual.uid,
            creadorNombre: nombreReal,
            mazoId: mazoId,
            nombreMazo: nombreMazo,
            codigoAcceso: codigoCorto,
            estado: "esperando",
            fechaCreacion: serverTimestamp(),
            expiraEn: new Date(Date.now() + 2 * 60 * 60 * 1000),
        });

        // 2. Registramos al creador como el participante #1
        const participanteRef = doc(db, "sesiones", sesionRef.id, "participantes", usuarioActual.uid);
        await setDoc(participanteRef, {
            nombre: nombreReal,
            unidoEn: serverTimestamp(),
            aportesContador: 0
        });

        return sesionRef.id;

    } catch (error) {
        console.error("Error al crear sesión en Firestore:", error);
        Alert.alert("Error", "No se pudo crear la sesión: " + error.message);
        return null;
    }
};