import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert
} from "react-native";

import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#fff"
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 24,
        textAlign: "center"
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12
    },
    button: {
        backgroundColor: "#4CAF50",
        padding: 14,
        borderRadius: 8,
        alignItems: "center"
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold"
    },
    link: {
        marginTop: 16,
        textAlign: "center",
        color: "#007BFF"
    }
});

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async() => {
        if (!email || !password) {
            Alert.alert("Error", "Completa todos los campos");
            return;
        }

        try {
            const user = await signInWithEmailAndPassword(auth, email, password);
            console.log("Usuario logueado:", user.user.uid);

            Alert.alert("Éxito", "Bienvenido");

            // Aquí puedes navegar a otra pantalla
            // navigation.navigate("Home");

        } catch (error) {
            Alert.alert("Error", error.message);
        }
    };

    return ( <
        View style = { styles.container } >
        <
        Text style = { styles.title } > Tarjetas GO < /Text>

        <
        TextInput style = { styles.input }
        placeholder = "Correo electrónico"
        value = { email }
        onChangeText = { setEmail }
        autoCapitalize = "none" /
        >

        <
        TextInput style = { styles.input }
        placeholder = "Contraseña"
        value = { password }
        onChangeText = { setPassword }
        secureTextEntry /
        >

        <
        TouchableOpacity style = { styles.button }
        onPress = { handleLogin } >
        <
        Text style = { styles.buttonText } > Ingresar < /Text> < /
        TouchableOpacity >

        <
        TouchableOpacity >
        <
        Text style = { styles.link } > ¿No tienes cuenta ? Regístrate < /Text> < /
        TouchableOpacity > < /View>
    );
}