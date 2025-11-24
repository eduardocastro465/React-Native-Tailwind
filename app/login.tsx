import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon, AtSymbolIcon, LockClosedIcon } from "react-native-heroicons/outline";
import { AuthService } from './services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [errorMessage, setErrorMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const attemptsRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleLogin = async () => {
    if (isLocked) {
      setErrorMessage(`Demasiados intentos. Intenta de nuevo en ${remainingTime} segundos.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const requestPayload = { email, password };
      const response: any = await AuthService.signIn(requestPayload);

      // El backend te regresa: { token, usuario }
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

      // Solo permitir acceso CLIENTE
      if (usuario.rol !== "CLIENTE") {
        setErrorMessage("No tienes permisos para acceder a esta sección.");
        return;
      }

      // Guardar usuario + token
      await AsyncStorage.setItem("userData", JSON.stringify(usuario));
      await AsyncStorage.setItem("token", response.token);

      console.log("Usuario CLIENTE logueado:", usuario);

      // Ir al home
      router.replace("/home");
    }
    catch (error: any) {
      console.error('Error en el login:', error);
      const status = error.status;
      let message = 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.';

      if (status === 401) message = 'Credenciales inválidas. Verifica tu correo y contraseña.';
      else if (status === 403) {
        message = error.error?.message || 'Cuenta bloqueada. Demasiados intentos fallidos.';
        const tiempoDeBloqueo = error.error?.tiempo;
        if (tiempoDeBloqueo) startCountdown(tiempoDeBloqueo);
      } else if (status === 503) message = 'El servicio no está disponible. Por favor, inténtalo de nuevo más tarde.';
      else if (error.error?.message) message = error.error.message;

      setErrorMessage(message);
    }
    finally {
      setIsLoading(false);
    }
  };




  return (
    <SafeAreaView className="flex-1 bg-white">

      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full max-w-sm aspect-square mb-2">
          <Image
            source={{ uri: 'https://res.cloudinary.com/dvvhnrvav/image/upload/v1746397789/shlcavwsffgxemctxdml.png' }}
            className="w-full h-full rounded-3xl"
            resizeMode="cover"
          />
        </View>

        <Text className="text-4xl font-extrabold text-black mb-2 text-center">Inicia Sesión</Text>
        <Text className="text-base text-gray-500 mb-8 text-center max-w-xs">
          Ingresa tus datos para acceder a tu cuenta y disfrutar de la aplicación.
        </Text>

        <View className="w-full space-y-4 mb-4">
          {/* Email */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Correo electrónico</Text>
            <View className="relative w-full h-14 flex-row items-center bg-gray-50 border border-gray-300 rounded-lg px-4">
              <AtSymbolIcon size={20} color="#6B7280" className="mr-3" />
              <TextInput
                className="flex-1 text-base text-gray-900 ml-2"
                placeholder="tu@ejemplo.com"
                placeholderTextColor="#a1a1aa"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Contraseña</Text>
            <View className="relative w-full h-14 flex-row items-center bg-gray-50 border border-gray-300 rounded-lg px-4">
              <LockClosedIcon size={20} color="#6B7280" className="mr-3" />
              <TextInput
                className="flex-1 text-base text-gray-900 ml-2"
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                {showPassword ? <EyeIcon size={20} color="#6B7280" /> : <EyeSlashIcon size={20} color="#6B7280" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {errorMessage ? <Text className="text-red-500 text-sm mb-4">{errorMessage}</Text> : null}

        <TouchableOpacity className="self-end mb-6">
          <Text className="text-sm font-medium text-black">¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`w-full h-14 bg-black justify-center items-center rounded-lg ${isLoading || isLocked ? 'opacity-50' : ''}`}
          onPress={handleLogin}
          disabled={isLoading || isLocked}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white text-lg font-bold">
              {isLocked ? `Bloqueado (${remainingTime}s)` : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Enlace de registro */}
        <TouchableOpacity
          className="mt-4"
          onPress={() => {
            // Abrir link en navegador
            Linking.openURL('https://proyecto-atr.vercel.app/auth/Sign-up');
          }}
        >
          <Text className="text-purple-600 text-center underline text-base">
            ¿No tienes cuenta? Registrarme
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
