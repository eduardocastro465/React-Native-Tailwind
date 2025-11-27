import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Linking,
  Platform, // <-- Importante: Agregado para detectar plataforma
} from "react-native";
import { useRouter } from "expo-router";
import {
  EyeIcon,
  EyeSlashIcon,
  AtSymbolIcon,
  LockClosedIcon,
} from "react-native-heroicons/outline";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthService } from "../src/services/AuthService";

interface UserData {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
  fotoDePerfil: string;
}

const LoginScreen = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const attemptsRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // =====================================================
  //              BLOQUEO DE INTENTOS
  // =====================================================

  const startCountdown = (lockTime: number) => {
    setRemainingTime(lockTime);
    setIsLocked(true);

    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
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

  // =====================================================
  //           LOGIN NORMAL CORREO + PASSWORD
  // =====================================================

  const handleLogin = async () => {
    if (isLocked) {
      setErrorMessage(`Demasiados intentos. Intenta en ${remainingTime} s.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

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
        setErrorMessage("No tienes permisos.");
        return;
      }

      await AsyncStorage.setItem("userData", JSON.stringify(usuario));
      await AsyncStorage.setItem("token", response.token);

      router.replace("/home");
    } catch (error: any) {
      console.error("Login:", error);
      let msg = "Error inesperado.";

      if (error.status === 401) msg = "Credenciales inválidas.";
      else if (error.status === 403) {
        msg = error.error?.message || "Cuenta bloqueada.";
        if (error.error?.tiempo) startCountdown(error.error.tiempo);
      }

      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  //                      UI
  // =====================================================

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center p-6">
        {/* Imagen */}
        <View className="w-full max-w-sm aspect-square mb-2">
          <Image
            source={{
              uri: "https://res.cloudinary.com/dvvhnrvav/image/upload/v1746397789/shlcavwsffgxemctxdml.png",
            }}
            className="w-full h-full rounded-3xl"
            resizeMode="cover"
          />
        </View>

        <Text className="text-4xl font-extrabold text-black mb-2 text-center">
          Inicia Sesión
        </Text>

        {/* Inputs */}
        <View className="w-full space-y-4 mb-4">
          {/* Email */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </Text>
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
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </Text>
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
                {showPassword ? (
                  <EyeIcon size={20} color="#6B7280" />
                ) : (
                  <EyeSlashIcon size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Error */}
        {errorMessage ? (
          <Text className="text-red-500 text-sm mb-4 text-center">
            {errorMessage}
          </Text>
        ) : null}

        {/* Login normal */}
        <TouchableOpacity
          className={`w-full h-14 bg-black rounded-lg justify-center items-center mb-4 ${
            isLoading || isLocked ? "opacity-50" : ""
          }`}
          onPress={handleLogin}
          disabled={isLoading || isLocked}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">
              {isLocked ? `Bloqueado (${remainingTime}s)` : "Entrar"}
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-2">
          <Text className="text-gray-500 text-sm">¿No tienes cuenta?</Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL("https://proyecto-atr.vercel.app/auth/Sign-up")
            }
          >
            <Text className="text-purple-600 underline font-semibold text-sm ml-1">
              Regístrate aquí
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;