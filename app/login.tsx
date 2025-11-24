// LoginScreen.tsx - Versión corregida usando AuthService

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon, AtSymbolIcon, LockClosedIcon } from "react-native-heroicons/outline";
import { AuthService, ISignInRequest } from './services/AuthService';

// Componente FadeInView reemplazado con Animated
const FadeInView = (props: { delay?: number; duration?: number; children: React.ReactNode; className?: string }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: props.duration || 500,
      delay: props.delay || 0,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, props.delay, props.duration]);

  return (
    <Animated.View style={{ opacity: fadeAnim }} className={props.className}>
      {props.children}
    </Animated.View>
  );
};

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

    if (!email || !password) {
      setErrorMessage('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      console.log("Iniciando proceso de login...");
      
      const requestPayload: ISignInRequest = {
        email: email.trim(),
        password: password
      };

      const response = await AuthService.signIn(requestPayload);
      
      console.log("Login exitoso, redirigiendo...");
      router.replace('/home');
      
    } catch (error: any) {
      console.error('Error en el login:', error);
      const status = error.status;
      let message = 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.';

      if (status === 401) {
        message = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        attemptsRef.current += 1;
        if (attemptsRef.current >= 3) {
          startCountdown(30); // Bloquea por 30 segundos después de 3 intentos
        }
      } else if (status === 403) {
        message = error.error?.message || 'Cuenta bloqueada. Demasiados intentos fallidos.';
        const tiempoDeBloqueo = error.error?.tiempo;
        if (tiempoDeBloqueo) startCountdown(tiempoDeBloqueo);
      } else if (status === 503) {
        message = 'El servicio no está disponible. Por favor, inténtalo de nuevo más tarde.';
      } else if (error.error?.message) {
        message = error.error.message;
      } else if (status === 0) {
        message = 'Error de conexión. Por favor, verifica tu conexión a internet.';
      }

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      

      <View className="flex-1 items-center justify-center p-6">
        {/* Imagen con animación */}
        <FadeInView delay={200} className="w-full max-w-sm aspect-square mb-2">
          <Image
            source={{ uri: 'https://res.cloudinary.com/dvvhnrvav/image/upload/v1746397789/shlcavwsffgxemctxdml.png' }}
            className="w-full h-full rounded-3xl"
            resizeMode="contain"
          />
        </FadeInView>

        {/* Títulos con animación escalonada */}
        <FadeInView delay={300}>
          <Text className="text-4xl font-extrabold text-black mb-2 text-center">Inicia Sesión</Text>
        </FadeInView>

        <FadeInView delay={400}>
          <Text className="text-base text-gray-500 mb-8 text-center max-w-xs">
            Ingresa tus datos para acceder a tu cuenta y disfrutar de la aplicación.
          </Text>
        </FadeInView>

        {/* Formulario con animación */}
        <FadeInView delay={500} className="w-full space-y-4 mb-4">
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
                editable={!isLocked}
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
                editable={!isLocked}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)} 
                className="p-2"
                disabled={isLocked}
              >
                {showPassword ? <EyeIcon size={20} color="#6B7280" /> : <EyeSlashIcon size={20} color="#6B7280" />}
              </TouchableOpacity>
            </View>
          </View>
        </FadeInView>

        {/* Mensaje de error con animación */}
        {errorMessage ? (
          <FadeInView duration={500}>
            <Text className="text-red-500 text-sm mb-4 text-center">{errorMessage}</Text>
          </FadeInView>
        ) : null}

        {/* Botón olvidé contraseña */}
        <FadeInView delay={600}>
          <TouchableOpacity className="self-end mb-6">
            <Text className="text-sm font-medium text-black">¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </FadeInView>

        {/* Botón de login */}
        <FadeInView delay={700} className="w-full">
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
        </FadeInView>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;