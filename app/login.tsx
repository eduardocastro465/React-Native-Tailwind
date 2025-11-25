import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, SafeAreaView, 
  ActivityIndicator, Image, Linking 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  EyeIcon, EyeSlashIcon, AtSymbolIcon, LockClosedIcon 
} from "react-native-heroicons/outline";
import { AuthService } from './services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

interface UserData {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
  fotoDePerfil: string;
}

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const attemptsRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Configurar Google
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '834293716338-r6eovllbh7eq5ln06d10h7ov6udh92bd.apps.googleusercontent.com',
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = (lockTime: number) => {
    setRemainingTime(lockTime);
    setIsLocked(true);

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsLocked(false);
          attemptsRef.current = 0;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // LOGIN GOOGLE
  async function onGoogleButtonPress() {
    setIsGoogleLoading(true);
    setErrorMessage('');

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const googleUserInfo = await GoogleSignin.signIn();
      const googleCredential = auth.GoogleAuthProvider.credential(googleUserInfo.idToken);
      const firebaseUser = await auth().signInWithCredential(googleCredential);
      const firebaseIdToken = await auth().currentUser?.getIdToken();

      if (!firebaseIdToken) throw new Error('No se pudo obtener token');

      console.log("Google User:", firebaseUser.user.toJSON());

      router.replace("/home");
    } catch (error: any) {
      console.error('Error Google:', error);
      setErrorMessage('Error al iniciar sesión con Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  }

  // LOGIN NORMAL
  const handleLogin = async () => {
    if (isLocked) {
      setErrorMessage(`Demasiados intentos. Intenta en ${remainingTime} s.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response: any = await AuthService.signIn({ email, password });

      if (!response.token || !response.usuario) {
        setErrorMessage("Respuesta inválida del servidor.");
        return;
      }

      const usuario: UserData = {
        _id: response.usuario._id,
        nombre: response.usuario.nombre,
        email: response.usuario.email,
        rol: response.usuario.rol,
        fotoDePerfil: response.usuario.fotoDePerfil,
      };

      if (usuario.rol !== "CLIENTE") {
        setErrorMessage("No tienes permisos para acceder.");
        return;
      }

      await AsyncStorage.setItem("userData", JSON.stringify(usuario));
      await AsyncStorage.setItem("token", response.token);

      router.replace("/home");
    }
    catch (error: any) {
      console.error('Login:', error);
      const status = error.status;
      let msg = "Error inesperado.";

      if (status === 401) msg = 'Credenciales inválidas.';
      else if (status === 403) {
        msg = error.error?.message || 'Cuenta bloqueada.';
        if (error.error?.tiempo) startCountdown(error.error.tiempo);
      }
      else if (status === 503) msg = 'Servicio no disponible.';
      else if (error.error?.message) msg = error.error.message;

      setErrorMessage(msg);
    }
    finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center p-6">

        {/* Imagen */}
        <View className="w-full max-w-sm aspect-square mb-2">
          <Image
            source={{ uri: 'https://res.cloudinary.com/dvvhnrvav/image/upload/v1746397789/shlcavwsffgxemctxdml.png' }}
            className="w-full h-full rounded-3xl"
            resizeMode="cover"
          />
        </View>

        {/* Texto */}
        <Text className="text-4xl font-extrabold text-black mb-2 text-center">Inicia Sesión</Text>
        <Text className="text-base text-gray-500 mb-6 text-center max-w-xs">
          Ingresa tus datos para acceder a tu cuenta.
        </Text>

        {/* Inputs */}
        <View className="w-full space-y-4 mb-4">

          {/* Email */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Correo electrónico</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-lg px-4 h-14">
              <AtSymbolIcon size={20} color="#6B7280" />
              <TextInput
                className="flex-1 text-base text-gray-900 ml-2"
                placeholder="tu@ejemplo.com"
                placeholderTextColor="#a1a1aa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Contraseña */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Contraseña</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-lg px-4 h-14">
              <LockClosedIcon size={20} color="#6B7280" />
              <TextInput
                className="flex-1 text-base text-gray-900 ml-2"
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword 
                  ? <EyeIcon size={20} color="#6B7280" /> 
                  : <EyeSlashIcon size={20} color="#6B7280" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Mensaje error */}
        {errorMessage ? (
          <Text className="text-red-500 text-sm mb-4 text-center">{errorMessage}</Text>
        ) : null}

        {/* Recuperar contraseña */}
        <TouchableOpacity className="self-end mb-4">
          <Text className="text-sm font-medium text-black">¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        {/* BOTÓN LOGIN */}
        <TouchableOpacity
          className={`w-full h-14 bg-black rounded-lg justify-center items-center mb-4 ${
            isLoading || isLocked ? 'opacity-50' : ''
          }`}
          onPress={handleLogin}
          disabled={isLoading || isLocked}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">
              {isLocked ? `Bloqueado (${remainingTime}s)` : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        {/* GOOGLE LOGIN */}
        <TouchableOpacity
          className={`w-full h-14 bg-white border border-gray-300 rounded-lg flex-row items-center justify-center mb-6 ${
            isGoogleLoading ? 'opacity-50' : ''
          }`}
          onPress={onGoogleButtonPress}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#666" />
          ) : (
            <>
              <Image
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                className="w-6 h-6 mr-3"
              />
              <Text className="text-gray-700 text-lg font-bold">Continuar con Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ✔ Enlace registro centrado, pequeño y profesional */}
        <View className="flex-row justify-center mt-2">
          <Text className="text-gray-500 text-sm">¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://proyecto-atr.vercel.app/auth/Sign-up")}>
            <Text className="text-purple-600 underline font-semibold text-sm">Regístrate aquí</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
