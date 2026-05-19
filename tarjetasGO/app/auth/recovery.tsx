import React, { useState } from 'react';
import { StyleSheet, TextInput, Button, Alert } from 'react-native';
import { auth } from '../../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Atención", "Por favor, ingresa tu correo electrónico.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Correo enviado", 
        "Revisa tu bandeja de entrada para restablecer tu contraseña."
      );
    } catch (error: any) {
      // Manejo de errores comunes (ej: usuario no encontrado)
      Alert.alert("Error", "No se pudo enviar el correo. Verifica que el email sea correcto.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Recuperar Contraseña</ThemedText>
      <ThemedText style={styles.description}>
        Ingresa tu correo y te enviaremos un enlace para que crees una nueva contraseña.
      </ThemedText>
      
      <TextInput 
        placeholder="Tu correo electrónico" 
        style={styles.input} 
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#888"
      />
      
      <Button 
        title="Enviar enlace" 
        onPress={handleResetPassword} 
        color="#A1CEDC"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 30, 
    gap: 15 
  },
  description: {
    marginBottom: 10,
    fontSize: 14,
    opacity: 0.8
  },
  input: { 
    backgroundColor: '#f0f0f0', 
    padding: 15, 
    borderRadius: 10, 
    color: '#000' 
  }
});