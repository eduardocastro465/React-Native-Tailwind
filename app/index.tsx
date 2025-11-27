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
    "http://res.cloudinary.com/dvvhnrvav/image/upload/v1752967722/ProductosAtelier/gyhht3zkmcdknv1roqmu.png",
    "http://res.cloudinary.com/dvvhnrvav/image/upload/v1752964151/ProductosAtelier/opoysc0vtvmlnuyhlquy.png",

    "https://scontent.cdninstagram.com/v/t39.30808-6/557318205_122146846244840171_7668556971070462727_n.jpg?stp=c3.0.834.944a_dst-jpg_e35_tt6&_nc_cat=100&ig_cache_key=MzczMjU1ODAwMDA1MDg0MTYyNQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjg0MXg5NDQuc2RyLkMzIn0%3D&_nc_ohc=P-hNHtQVHPsQ7kNvwFNq4am&_nc_oc=AdmzE3e-aU4_YUD8uNXa8rNdHx72bZ5nQmvOKz2vR_z7Jo7dUS38MMfDy2qtwxU885U&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=O5ScAynN4yJ3hnEx3SjApA&oh=00_AfjxEzhpjBlKbvdTpil-sJqrTiBT5zDxsNxwBmmlnX8yiQ&oe=692A2B0C",
    "https://scontent.cdninstagram.com/v/t39.30808-6/556669319_122146846286840171_7169721671659904766_n.jpg?stp=c0.4.839.948a_dst-jpg_e35_tt6&_nc_cat=100&ig_cache_key=MzczMjU1Nzk5OTczMjA1NDAwMg%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjgzOXg5NTYuc2RyLkMzIn0%3D&_nc_ohc=XagqdU8LsrcQ7kNvwF7QE29&_nc_oc=Adn8sfExAPwcEr0zWzVpqFgRgEp2J_5sLDE2dWpdaB_gqlzY2bbuiJPdXfu9rH8nPSg&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=O5ScAynN4yJ3hnEx3SjApA&oh=00_Afg2Q64e1aDHpaZl225yxjRgqm5rGgxhswmKLmW9Cv3WeA&oe=692A20D6",
    "https://scontent.cdninstagram.com/v/t15.5256-10/583922970_1165003595177611_2472123475070168671_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=111&ig_cache_key=Mzc2NTg3NDg3NTk4Mzc5NTk2OQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjEwNzJ4MTkwNC5zZHIuQzMifQ%3D%3D&_nc_ohc=gFvMqzlHBV4Q7kNvwH18mhV&_nc_oc=Adk01plMO50xbPqEnh5yo5zzDwanGh97TqXggnjuouUj2S83QGJOPtU0arPrIvEewd0&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=O5ScAynN4yJ3hnEx3SjApA&oh=00_Afht7Ig8L_Crj27Rbdg-5KdrgDAWc9-MZlccIU2CFOYk1A&oe=692A2CC8",
    "https://scontent.cdninstagram.com/v/t15.5256-10/581574747_1173374554260551_8465920958916393840_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=109&ig_cache_key=Mzc2NTE3MjAzOTg1MDg0ODU4MQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjEwNzJ4MTkwNC5zZHIuQzMifQ%3D%3D&_nc_ohc=_9JQHNEGQMsQ7kNvwHe3lsW&_nc_oc=Adm1FzIXfLs0-1hUdmBkv3GIbBzREyL5EN06BYBXreHchWdX93m_uxR1r4zeuoxRZzw&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=O5ScAynN4yJ3hnEx3SjApA&oh=00_AfheLi9Zq6B1l4OHE0aqeXJRd5SQlLW-er3-egzSfzLFdQ&oe=692A1983",
    "https://scontent.cdninstagram.com/v/t15.5256-10/581661297_1334727424413109_4260006069769031482_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=111&ig_cache_key=Mzc2NDQyMTE3MDY3NTA3MTk2NQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjkxMngxNjMyLnNkci5DMyJ9&_nc_ohc=m_o7AjvgTe8Q7kNvwGYwUdm&_nc_oc=AdldMjp0iF3BIwiB1KwN_dB9xxZu2_CG5BhnBCbS4tFV_nHj04-xD_rcFKTE6lgzcgA&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=O5ScAynN4yJ3hnEx3SjApA&oh=00_AfhKlWYuv_sf9NpXSvUa-c5l-bY4BpA9N7v0n-9ye2R68w&oe=692A3ECC",
    "https://scontent.cdninstagram.com/v/t15.5256-10/577901690_1542162717210317_7502761394705768218_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=109&ig_cache_key=Mzc2MTQ4Mjc1NDgyNDE1OTM3Ng%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjkxMngxNjMyLnNkci5DMyJ9&_nc_ohc=Nlae67WxoY0Q7kNvwF-zm-h&_nc_oc=AdlI4BiqQDRQHwkJQZdAnrarhs-RWXvpFgCpu1vakv-8Tzt1is2g_ynxYbUxOUaLs48&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=O5ScAynN4yJ3hnEx3SjApA&oh=00_AfjUtI4OwayYtO-uwscqwuPgsA1AcHWDBWxmRTenNSMisg&oe=692A4E6B",
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
              source={{ uri: url }}
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
