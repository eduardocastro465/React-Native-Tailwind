import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";

export default function Index() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      {/* Logo */}
      <View className="mb-8">
        <Image
          source={require("../assets/Facilito.png")}
          className="w-48 h-48 rounded-2xl"
          resizeMode="contain"
        />
      </View>

      {/* Título y subtítulo */}
      <Text className="text-4xl font-bold text-gray-900 tracking-tight mb-2">
        Atelier
      </Text>
      <Text className="text-lg text-gray-600 text-center mb-8 leading-6">
        Comparte tus mejores outfits y encuentra inspiración todos los días.
      </Text>

      {/* Características */}
      <View className="w-full mb-10">
        <View className="flex-row items-center mb-4">
          <View className="w-2 h-2 bg-gray-900 rounded-full mr-3" />
          <Text className="text-gray-700">Descubre tendencias</Text>
        </View>
        <View className="flex-row items-center mb-4">
          <View className="w-2 h-2 bg-gray-900 rounded-full mr-3" />
          <Text className="text-gray-700">Comparte tu estilo</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 bg-gray-900 rounded-full mr-3" />
          <Text className="text-gray-700">Conecta con la comunidad</Text>
        </View>
      </View>

      {/* Botón principal */}
      <TouchableOpacity
        className="bg-gray-900 py-4 px-8 rounded-full w-full items-center mb-4"
        onPress={() => router.push("/home")}
      >
        <Text className="text-white font-semibold text-lg">Comenzar</Text>
      </TouchableOpacity>

      <Text className="text-gray-500 text-center mt-6 text-sm">
        Únete a miles de amantes de la moda
      </Text>
    </View>
  );
}