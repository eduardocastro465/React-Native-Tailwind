import { useRouter } from "expo-router";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
} from "react-native";
import { useEffect, useRef } from "react";

export default function Index() {
  const router = useRouter();

  const images = [
    require("../assets/images-index/img_1.png"),
    require("../assets/images-index/img_2.png"),
    require("../assets/images-index/img_3.jpg"),
    require("../assets/images-index/img_4.jpg"),
    require("../assets/images-index/img_5.jpg"),
    require("../assets/images-index/img_6.jpg"),
    require("../assets/images-index/img_7.jpg"),
    require("../assets/images-index/img_8.jpg"),
  ];
  

  const { width } = Dimensions.get("window");
  const radius = 130;

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 18000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View className="flex-1 bg-[#f6f2e7] items-center justify-center px-6">
      {/* ------------------ LOGO / TÍTULO ATELIER ------------------ */}
      <Text className="text-4xl font-normal tracking-widest text-black mb-10 mt-5">
        ATELIER
      </Text>

      {/* ------------------ CÍRCULO DE IMÁGENES ------------------ */}
      <Animated.View
        style={{
          width: width,
          height: 300,
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate: spin }],
        }}
      >
        {images.map((url, i) => {
          const angle = (i * 2 * Math.PI) / images.length;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <Image
              key={i}
              source={url}
              style={{
                width: 70,
                height: 70,
                borderRadius: 10,
                position: "absolute",
                top: 150 + y - 30,
                left: width / 2 + x - 30,
              }}
            />
          );
        })}
      </Animated.View>

      {/* ------------------ IMAGEN CENTRAL ------------------ */}
      <View className="items-center mt-[-180px] mb-40">
        <Image
          source={require("../assets/atr.png")}
          className="w-20 h-20 rounded-3xl mb-10"
        />
      </View>

      {/* ------------------ TEXTO PRINCIPAL ------------------ */}
      <Text className="text-2xl text-center text-gray-600  px-5 mb-3">
        Encuentra tu estilo
      </Text>

      <Text className="text-black  font-normal  text-center px-6 text-4xl mb-8">
        Descubre inspiración y comparte tus mejores outfits.
      </Text>

      {/* ------------------ BOTÓN INICIAR ------------------ */}
      <TouchableOpacity
        className="bg-black py-4 px-8 rounded-full w-full items-center mb-4"
        onPress={() => router.push("/login")}
      >
        <Text className="text-white font-semibold text-lg">Comenzar</Text>
      </TouchableOpacity>

      <Text className="text-gray-500 text-center text-sm mb-4">
        Únete a la comunidad Atelier
      </Text>
    </View>
  );
}
