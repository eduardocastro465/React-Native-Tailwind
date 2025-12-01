import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Share,
} from "react-native";
import {
  PlusIcon,
  UserIcon,
  ChevronRightIcon,
  ArrowLeftOnRectangleIcon,
} from "react-native-heroicons/outline";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "../src/environments/environment";
import { jwtDecode } from "jwt-decode";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";
import { useFonts } from 'expo-font';

// --- DIMENSIONES Y CONSTANTES ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLUMN_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - COLUMN_GAP) / 2;
const CARD_MARGIN = 8;

// --- INTERFACES ---
interface TokenPayload {
  _id: string;
  rol: string;
  iat: number;
  exp: number;
}

interface Usuaria {
  _id: string;
  nombre: string;
  email: string;
  telefono: string;
  fotoDePerfil: string;
  apellidos: string;
  direccion: string;
  edad: number;
  localidad: string;
}

interface Like {
  _id: string;
  postId: string;
  usuariaId: string;
  fecha: string;
}

interface ApiPost {
  _id: string;
  usuariaId: string;
  imagenUrl?: string;
  imagenUrls?: string[];
  descripcion: string;
  etiqueta: string;
  aprobado: boolean;
  fecha: string;
  usuaria: Usuaria;
  likes: Like[];
  comentarios: any[];
  guardados: any[];
  likesCount: number;
  comentariosCount: number;
  guardadosCount: number;
  __v?: number;
}

interface Post {
  _id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  image_urls: string[];
  description: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_has_liked: boolean;
  user_has_saved: boolean;
  category?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  etiqueta?: string;
  aspectRatio?: number;
}

interface UserData {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
  fotoDePerfil: string;
}

const API_BASE_URL = environment.api + "/posts";

// CORREGIDO: Obtener ID del usuario desde el token
const getUserIdFromToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return null;

    const decoded = jwtDecode<TokenPayload>(token);
    return decoded._id || null;
  } catch (error) {
    console.error("Error decodificando token:", error);
    return null;
  }
};

// CORREGIDO: Obtener datos completos del usuario
const getUserData = async (): Promise<UserData | null> => {
  try {
    const userDataString = await AsyncStorage.getItem("userData");
    if (userDataString) {
      return JSON.parse(userDataString);
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo datos del usuario:", error);
    return null;
  }
};

const apiService = {
  getApprovedPosts: async (): Promise<ApiPost[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts-completos`, {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(`Error fetching posts: ${response.status}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching posts:", error);
      return [];
    }
  },

  likePost: async (postId: string, userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${userId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          usuariaId: userId,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error("Error liking post:", error);
      return false;
    }
  },

  unlikePost: async (postId: string, userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${userId}/like`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          usuariaId: userId,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error("Error unliking post:", error);
      return false;
    }
  },
};

// COMPARTIR URL O POST - CORREGIDO
const handleShare = async (post?: Post) => {
  try {
    const baseUrl = "https://atelier-play.en.aptoide.com";
    let message = `Descarga Atelier Play: ${baseUrl}`;

    if (post) {
      const postUrl = `${baseUrl}/post/${post._id}`;
      message = `Mira este post en Atelier Play: ${postUrl}\n\n${post.description}`;
    }

    await Share.share({
      message,
      title: "Atelier Play",
    });
  } catch (error) {
    console.error("Error al compartir:", error);
  }
};

// Función transformadora que recibe el userId dinámicamente
const transformApiPostToAppPost = (
  apiPost: ApiPost,
  currentUserId: string
): Post => {
  const sizes: Array<"small" | "medium" | "large" | "xlarge"> = [
    "small",
    "medium",
    "large",
    "xlarge",
  ];
  const randomSize = sizes[Math.floor(Math.random() * sizes.length)];

  const categoryMap: { [key: string]: string } = {
    comprado: "Purchased",
    rentado: "Rented",
    propio: "Own Style",
    nuevo: "New",
  };

  const userHasLiked = apiPost.likes.some(
    (like) => like.usuariaId === currentUserId
  );

  // Manejar imágenes: usar imagenUrls si existe, sino usar imagenUrl
  const imageUrls = apiPost.imagenUrls 
    ? apiPost.imagenUrls 
    : (apiPost.imagenUrl ? [apiPost.imagenUrl] : []);

  return {
    _id: apiPost._id,
    user_id: apiPost.usuariaId,
    user_name: apiPost.usuaria.nombre,
    user_avatar: apiPost.usuaria.fotoDePerfil,
    image_urls: imageUrls,
    description: apiPost.descripcion,
    likes_count: apiPost.likesCount || 0,
    comments_count: apiPost.comentariosCount || 0,
    created_at: apiPost.fecha,
    user_has_liked: userHasLiked,
    user_has_saved: false,
    category: categoryMap[apiPost.etiqueta] || "Style",
    size: randomSize,
    aspectRatio: 0.75 + Math.random() * 0.5,
    etiqueta: apiPost.etiqueta,
  };
};

const PostCard: React.FC<{
  post: Post;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
  onProfilePress: (userId: string) => void;
  onPostPress: (post: Post) => void;
}> = ({ post, onLike, onSave, onComment, onProfilePress, onPostPress }) => {
  const [isDoubleTap, setIsDoubleTap] = useState(false);
  const [imageHeight, setImageHeight] = useState(CARD_WIDTH * 1.2);
  const lastTapRef = useRef<number | null>(null);
  const [localPost, setLocalPost] = useState(post); // Estado local para el post

  const handleLike = () => {
    // Actualización local sin recargar toda la vista
    setLocalPost(prev => ({
      ...prev,
      user_has_liked: !prev.user_has_liked,
      likes_count: prev.user_has_liked ? prev.likes_count - 1 : prev.likes_count + 1,
    }));
    onLike(post._id);
  };

  // FUNCIÓN DE COMPARTIR CORREGIDA
  const handleSharePost = async () => {
    await handleShare(post);
  };

  const getTimeAgo = () => {
    const diff = Math.floor(
      (Date.now() - new Date(post.created_at).getTime()) / 1000
    );
    if (diff < 60) return "ahora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)} sem`;
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current < 500) {
      setIsDoubleTap(true);
      if (!localPost.user_has_liked) handleLike();
      setTimeout(() => setIsDoubleTap(false), 600);
    }
    lastTapRef.current = now;
  };

  const handleImageLoad = (event: any) => {
    const native = event?.nativeEvent || {};
    const width =
      native?.source?.width ?? native?.width ?? native?.naturalWidth;
    const height =
      native?.source?.height ?? native?.height ?? native?.naturalHeight;

    if (width && height) {
      const aspectRatio = height / width;
      setImageHeight(CARD_WIDTH * aspectRatio);
      return;
    }

    try {
      const uri = localPost.image_urls[0];
      if (uri) {
        Image.getSize(
          uri,
          (w: number, h: number) => {
            if (w && h) setImageHeight(CARD_WIDTH * (h / w));
          },
          () => {
            console.log("Error al cargar dimensiones de la imagen");
          }
        );
      }
    } catch (e) {
      console.log("Error en handleImageLoad:", e);
    }
  };

  return (
    <View
      style={{
        width: CARD_WIDTH,
        marginBottom: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {/* HEADER */}
      <View className="flex-row items-center justify-between p-3 pb-2">
        <TouchableOpacity
          onPress={() => onProfilePress(localPost.user_id)}
          className="flex-row items-center flex-1"
        >
          <Image
            source={{ uri: localPost.user_avatar }}
            className="w-6 h-6 rounded-full bg-gray-200"
            onError={(e) =>
              console.log("Error loading avatar:", e.nativeEvent.error)
            }
          />
          <View className="ml-2 flex-1">
            <Text
              className="text-[10px] font-semibold text-gray-900"
              numberOfLines={1}
            >
              {localPost.user_name}
            </Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              {localPost.category && (
                <Text className="text-[8px] text-gray-500 uppercase tracking-wider">
                  {localPost.category}
                </Text>
              )}
              <Text className="text-[8px] text-gray-400">• {getTimeAgo()}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity className="p-1">
          <Feather name="more-horizontal" size={13} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* IMAGE WITH DOUBLE TAP */}
      <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap}>
        <View className="relative">
          {localPost.image_urls && localPost.image_urls.length > 0 ? (
            <Image
              source={{ uri: localPost.image_urls[0] }}
              style={{ height: imageHeight, width: CARD_WIDTH }}
              className="bg-gray-100"
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={(e) =>
                console.log("Error loading image:", e.nativeEvent.error)
              }
            />
          ) : (
            <View style={{ height: imageHeight, width: CARD_WIDTH, backgroundColor: "#f3f4f6" }} />
          )}

          {isDoubleTap && (
            <View className="absolute inset-0 items-center justify-center bg-black/20">
              <Feather name="heart" size={40} color="#EF4444" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ACTION BUTTONS */}
      <View className="flex-row items-center justify-between p-3">
        <View className="flex-row items-center">
          {/* LIKE BUTTON */}
          <TouchableOpacity
            onPress={handleLike}
            className="flex-row items-center mr-3"
          >
            <Ionicons
              name={localPost.user_has_liked ? "heart" : "heart-outline"}
              size={16}
              color={localPost.user_has_liked ? "#EF4444" : "#000000"}
            />
            <Text className="text-[10px] font-semibold text-gray-900 ml-1">
              {localPost.likes_count}
            </Text>
          </TouchableOpacity>

          {/* COMMENT BUTTON */}
          <TouchableOpacity
            onPress={() => onComment(localPost._id)}
            className="flex-row items-center mr-3"
          >
            <Ionicons name="chatbubble-outline" size={16} color="#000000" />
            <Text className="text-[10px] font-semibold text-gray-900 ml-1">
              {localPost.comments_count}
            </Text>
          </TouchableOpacity>

          {/* SHARE BUTTON - CORREGIDO */}
          <TouchableOpacity onPress={handleSharePost}>
            <Ionicons name="share-outline" size={16} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity onPress={() => onSave(localPost._id)}>
          <Ionicons
            name={localPost.user_has_saved ? "bookmark" : "bookmark-outline"}
            size={16}
            color="#000000"
          />
        </TouchableOpacity>
      </View>

      {/* DESCRIPTION & COMMENTS */}
      <View className="p-3 pt-0">
        <TouchableOpacity onPress={() => onPostPress(localPost)}>
          {localPost.description && (
            <Text
              className="text-[10px] text-gray-700 leading-3.5"
              numberOfLines={2}
            >
              <Text className="font-semibold">{localPost.user_name} </Text>
              {localPost.description}
            </Text>
          )}

          {localPost.comments_count > 0 && (
            <Text className="text-[9px] text-gray-500 mt-1">
              Ver {localPost.comments_count} comentarios
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const HeroImageSection = () => {
  return (
    <View className={`flex-1 justify-center items-center  p-6`}>
      <Image
        source={require('../assets/imgs-heros/img1.png')}
        className={`w-full h-64  rounded-2xl`}
        resizeMode="stretch"
      />
    </View>
  );
};

const HeroImageSection2 = () => {
  return (
    <View className={`flex-1 justify-center items-center  p-6`}>
      <Image
        source={require('../assets/imgs-heros/img3.png')}
        className={`w-full h-72  rounded-4xl`}
        resizeMode="contain"
      />
    </View>
  );
};

const HeroSection = () => {
  // Cargar fuente personalizada
  const [fontsLoaded] = useFonts({
    'HaveYouEaten': require('../assets/fonts/MatildaDestinee-Regular.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <View className="h-[50vh] flex-row bg-[#f6f2e7] mt-1 mx-0 rounded-2xl overflow-hidden p-6">
      {/* Contenedor de texto más ancho */}
      <View className="flex-[1.2] justify-center">
        {/* Título principal con HaveYouEaten */}
        <Text
          style={{
            fontFamily: 'HaveYouEaten',
            fontSize: 100,
            color: '#5a4b39',
            lineHeight: 120,
          }}
        >
          Atelier
        </Text>

        {/* Subtítulo más grande y elegante */}
        <Text
          style={{
            fontSize: 20,
            color: '#4a4a4a',
            fontWeight: '400',
          }}
        >
          venta y renta de vestidos
        </Text>

        {/* Texto descriptivo */}
        <Text
          style={{
            fontSize: 18,
            color: '#6b6b6b',
            marginTop: 1,
          }}
        >
          La esencia de la elegancia moderna
        </Text>
      </View>

      {/* Imagen ajustada */}
      <View className="flex-1 relative justify-center items-end">
        <Image
          source={{
            uri: 'https://res.cloudinary.com/dvvhnrvav/image/upload/v1746397789/shlcavwsffgxemctxdml.png',
          }}
          style={{
            width: '95%',
            height: '85%',
            borderRadius: 24,
          }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const PromoCard: React.FC = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleVisitWebsite = () => {
    Linking.openURL("https://proyecto-atr.vercel.app/").catch((err) =>
      console.error("Error al abrir URL:", err)
    );
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
      className="mx-5"
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleVisitWebsite}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 6,
            borderWidth: 1,
            borderColor: "#f3f4f6",
          }}
        >
          <View className="flex-row items-center justify-between p-5">
            <View className="flex-1 pr-4">
              <Text className="text-gray-900 text-xs font-semibold tracking-wider mb-1.5">
                EXPLORA MÁS
              </Text>

              <Text className="text-gray-900 text-lg font-bold mb-1.5">
                Descubre looks en nuestro sitio
              </Text>

              <Text className="text-gray-600 text-sm font-light mb-4">
                Encuentra tu estilo perfecto en la colección completa
              </Text>

              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-1.5">
                  <Feather name="external-link" size={14} color="#000000" />
                  <Text className="text-gray-900 text-xs font-medium">
                    Visitar sitio web
                  </Text>
                </View>

                <View className="w-px h-4 bg-gray-300" />

                <View className="bg-gray-900 px-2.5 py-1 rounded-full">
                  <Text className="text-white text-xs font-semibold">
                    Colección 2024
                  </Text>
                </View>
              </View>
            </View>

            <View className="relative">
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=250&fit=crop",
                }}
                className="w-20 h-16 rounded-lg"
                resizeMode="cover"
              />
              <View className="absolute bottom-1 right-1 bg-gray-900/80 rounded-full p-1.5">
                <Feather name="external-link" size={10} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SeccionOption: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const menuItems = [
    { title: "Crear Contenido", subtitle: "Empieza un nuevo post", path: "/crear-post", Icon: PlusIcon },
    { title: "Administrar Perfil", subtitle: "Ver y editar tu cuenta", path: "/profile", Icon: UserIcon },
  ];

  const isActive = (path: string) => (pathname === "/" && path === "/") || (path !== "/" && pathname.startsWith(path));

  const handleNavigation = (path: string) => router.push(path);

  // ✅ Función de cierre de sesión MEJORADA para no recargar posts
  const logout = async () => {
    try {
      // Limpiar datos de autenticación sin afectar el estado de posts
      await auth().signOut();
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) await GoogleSignin.signOut();
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userData");
      
      // Redirigir sin recargar la vista actual
      router.replace("/");
    } catch (error) {
      console.log("Error al cerrar sesión:", error);
    }
  };

  return (
    <View className="flex-1 bg-transparent">
      <View className="px-6 py-6 mb-6">
        <Text className="text-3xl font-bold text-gray-900 tracking-tight">EXPLORAR</Text>
        <Text className="text-sm text-gray-600 mt-2 font-medium">Navega y gestiona tu actividad</Text>
      </View>

      <View className="px-5">
        <View
          className="bg-white rounded-2xl overflow-hidden border border-gray-100"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          {menuItems.map(({ title, subtitle, path, Icon }, index) => {
            const active = isActive(path);
            const isLast = index === menuItems.length - 1;
            const itemClass = `
              flex-row items-center justify-between
              ${active ? "bg-gray-900" : "bg-white"}
              ${!isLast ? "border-b border-gray-100" : ""}
              p-4 active:scale-[0.98] transition-transform duration-100
            `;
            const iconColor = active ? "#FFFFFF" : "#111827";
            const titleClass = active ? "text-white" : "text-gray-900";
            const subtitleClass = active ? "text-white/70" : "text-gray-500";
            const chevronColor = active ? "#FFFFFF" : "#9CA3AF";

            return (
              <TouchableOpacity key={path} onPress={() => handleNavigation(path)} className={itemClass} activeOpacity={0.85}>
                <View className="flex-row items-center flex-1">
                  <View className={`w-11 h-11 rounded-xl items-center justify-center mr-4 ${active ? "bg-white/10" : "bg-gray-100"}`}>
                    <Icon size={22} color={iconColor} />
                  </View>
                  <View>
                    <Text className={`text-base font-bold ${titleClass}`}>{title}</Text>
                    <Text className={`text-xs mt-0.5 ${subtitleClass}`}>{subtitle}</Text>
                  </View>
                </View>
                <ChevronRightIcon size={18} color={chevronColor} style={{ opacity: active ? 1 : 0.4 }} />
              </TouchableOpacity>
            );
          })}

          {/* 🔴 BOTÓN DE CERRAR SESIÓN - MEJORADO */}
          <TouchableOpacity
            onPress={logout} // ✅ Llamamos la función mejorada
            activeOpacity={0.85}
            className="flex-row items-center justify-center gap-3 p-5 bg-white rounded-none mt-6"
            style={{
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <ArrowLeftOnRectangleIcon size={22} color="#EF4444" className="mr-4" />
            <Text className="text-red-500 font-bold text-base">Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const MasonryLayout = ({
  posts,
  onLike,
  onSave,
  onComment,
  onProfilePress,
  onPostPress,
}: {
  posts: Post[];
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
  onProfilePress: (userId: string) => void;
  onPostPress: (post: Post) => void;
}) => {
  const [columns, setColumns] = useState<Post[][]>([[], []]);

  useEffect(() => {
    const distributePosts = () => {
      const leftColumn: Post[] = [];
      const rightColumn: Post[] = [];
      let leftHeight = 0;
      let rightHeight = 0;

      posts.forEach((post) => {
        const postHeight = getPostHeight(post);

        if (leftHeight <= rightHeight) {
          leftColumn.push(post);
          leftHeight += postHeight + CARD_MARGIN * 2;
        } else {
          rightColumn.push(post);
          rightHeight += postHeight + CARD_MARGIN * 2;
        }
      });

      setColumns([leftColumn, rightColumn]);
    };

    distributePosts();
  }, [posts]);

  const getPostHeight = (post: Post) => {
    const baseHeight = CARD_WIDTH;
    switch (post.size) {
      case "small":
        return baseHeight * 0.8;
      case "medium":
        return baseHeight * 1.1;
      case "large":
        return baseHeight * 1.4;
      case "xlarge":
        return baseHeight * 1.7;
      default:
        return baseHeight;
    }
  };

  return (
    <View className="flex-row justify-between px-5 pt-2">
      {columns.map((column, columnIndex) => (
        <View key={columnIndex} className="flex-1 mx-1">
          {column.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={onLike}
              onSave={onSave}
              onComment={onComment}
              onProfilePress={onProfilePress}
              onPostPress={onPostPress}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const PostDetailModal: React.FC<{
  post: Post | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
  onProfilePress: (userId: string) => void;
}> = ({ post, onClose, onLike, onSave, onComment, onProfilePress }) => {
  const [imageHeight, setImageHeight] = useState(SCREEN_WIDTH * 1.2);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [localPost, setLocalPost] = useState(post); // Estado local para el post

  useEffect(() => {
    if (post) {
      setLocalPost(post);
    }
  }, [post]);

  useEffect(() => {
    if (localPost?.image_urls && localPost.image_urls.length > 0) {
      Image.getSize(localPost.image_urls[currentImageIndex], (width, height) => {
        const aspectRatio = height / width;
        setImageHeight(SCREEN_WIDTH * aspectRatio);
      });
    }
  }, [localPost?.image_urls, currentImageIndex]);

  const handleLike = async () => {
    if (!localPost) return;
    
    // Actualización local sin recargar toda la vista
    setLocalPost(prev => prev ? {
      ...prev,
      user_has_liked: !prev.user_has_liked,
      likes_count: prev.user_has_liked ? prev.likes_count - 1 : prev.likes_count + 1,
    } : null);
    
    await onLike(localPost._id);
  };

  const handleSave = async () => {
    if (!localPost) return;
    
    // Actualización local
    setLocalPost(prev => prev ? {
      ...prev,
      user_has_saved: !prev.user_has_saved,
    } : null);
    
    await onSave(localPost._id);
  };

  const handleShare = async () => {
    if (!localPost) return;
    await handleShare(localPost);
  };

  const getTimeAgo = () => {
    if (!localPost) return "";
    const diff = Math.floor(
      (Date.now() - new Date(localPost.created_at).getTime()) / 1000
    );
    if (diff < 60) return "ahora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)} sem`;
  };

  const handleProfileNavigate = () => {
    if (!localPost) return;
    onClose();
    onProfilePress(localPost.user_id);
  };

  const handleCommentNavigate = () => {
    if (!localPost) return;
    onClose();
    onComment(localPost._id);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => {
      if (localPost?.image_urls && localPost.image_urls.length > 0) {
        return prevIndex > 0 ? prevIndex - 1 : localPost.image_urls.length - 1;
      }
      return 0;
    });
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => {
      if (localPost?.image_urls && localPost.image_urls.length > 0) {
        return prevIndex < localPost.image_urls.length - 1 ? prevIndex + 1 : 0;
      }
      return 0;
    });
  };

  if (!localPost) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/40 px-3">
        {/* CONTENEDOR ELEGANTE */}
        <View
          className="w-full max-w-lg rounded-3xl p-6 bg-white"
          style={{ height: "60%" }}
        >
          {/* HEADER */}
          <View className="flex-row items-center justify-between border-b border-gray-200 pb-4">
            <TouchableOpacity
              onPress={handleProfileNavigate}
              className="flex-row items-center"
            >
              <Image
                source={{ uri: localPost.user_avatar }}
                className="w-10 h-10 rounded-full bg-gray-200"
              />
              <View className="ml-3">
                <Text className="text-sm font-semibold text-gray-900">
                  {localPost.user_name}
                </Text>
                <Text className="text-xs text-gray-500">{getTimeAgo()}</Text>
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              {localPost.category && (
                <View className="bg-gray-100 px-3 py-1 rounded-full">
                  <Text className="text-xs text-gray-700 font-medium">
                    {localPost.category}
                  </Text>
                </View>
              )}

              <TouchableOpacity onPress={onClose} className="p-2">
                <Feather name="x" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SCROLL DEL CONTENIDO */}
          <ScrollView className="flex-1 mt-3">
            <View className="relative">
              {localPost.image_urls && localPost.image_urls.length > 0 ? (
                <Image
                  source={{ uri: localPost.image_urls[currentImageIndex] }}
                  className="w-full h-96 bg-gray-100 rounded-2xl mb-5"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-96 bg-gray-100 rounded-2xl mb-5" />
              )}
              {localPost.image_urls.length > 1 && (
                <View className="absolute bottom-2 left-2 right-2 flex-row justify-between">
                  <TouchableOpacity onPress={handlePrevImage} className="p-2">
                    <Ionicons name="chevron-back-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNextImage} className="p-2">
                    <Ionicons name="chevron-forward-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View className="flex-row items-center justify-between pb-4">
              <View className="flex-row items-center gap-4">
                {/* LIKE */}
                <TouchableOpacity
                  onPress={handleLike}
                  className="flex-row items-center gap-1"
                >
                  <Ionicons
                    name={localPost.user_has_liked ? "heart" : "heart-outline"}
                    size={22}
                    color={localPost.user_has_liked ? "#EF4444" : "#6B7280"}
                  />
                  <Text
                    className={`text-sm font-medium ${localPost.user_has_liked ? "text-red-500" : "text-gray-700"
                      }`}
                  >
                    {localPost.likes_count}
                  </Text>
                </TouchableOpacity>

                {/* SHARE */}
                <TouchableOpacity
                  onPress={handleShare}
                  className="flex-row items-center gap-1"
                >
                  <Ionicons name="share-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* SAVE */}
              <TouchableOpacity onPress={handleSave}>
                <Ionicons
                  name={localPost.user_has_saved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={localPost.user_has_saved ? "#111827" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            {/* DESCRIPCIÓN */}
            <View className="pb-4">
              <Text className="text-sm text-gray-900 leading-6">
                <Text className="font-semibold">{localPost.user_name} </Text>
                {localPost.description}
              </Text>
            </View>

            {/* ETIQUETA */}
            {localPost.etiqueta && (
              <View className="pb-4">
                <View className="bg-gray-100 px-3 py-1.5 rounded-full self-start">
                  <Text className="text-xs font-medium text-gray-700">
                    #{localPost.etiqueta}
                  </Text>
                </View>
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const Home: React.FC = () => {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // CORREGIDO: Obtener el ID del usuario desde el token
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userId = await getUserIdFromToken();
        if (userId) {
          setCurrentUserId(userId);
          console.log("User ID cargado desde token:", userId);
        } else {
          console.log("No se pudo obtener el ID del usuario desde el token");
          const userData = await getUserData();
          if (userData && userData._id) {
            setCurrentUserId(userData._id);
            console.log("User ID cargado desde userData:", userData._id);
          } else {
            console.log("No se encontraron datos del usuario");
            router.push("/login");
          }
        }
      } catch (error) {
        console.error("Error cargando datos del usuario:", error);
        router.push("/login");
      }
    };

    loadUserData();
  }, []);

  const fetchAllData = async () => {
    if (!currentUserId) {
      console.log("Esperando ID del usuario...");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      console.log("Fetching posts from:", `${API_BASE_URL}/posts-completos`);
      const apiPosts = await apiService.getApprovedPosts();
      console.log("Posts received:", apiPosts.length);

      // Transformar posts y FILTRAR los del usuario actual
      const transformedPosts = apiPosts.map((apiPost) =>
        transformApiPostToAppPost(apiPost, currentUserId)
      );
      
      // 🔥 FILTRO: Excluir posts del usuario actual
      const filteredPosts = transformedPosts.filter((post) => post.user_id !== currentUserId);
      
      console.log("Transformed posts (filtered):", filteredPosts.length);
      console.log("Posts del usuario actual excluidos:", transformedPosts.length - filteredPosts.length);

      setPosts(filteredPosts);
    } catch (err) {
      console.error("Error in fetchAllData:", err);
      setError("Error al cargar los posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchAllData();
    }
  }, [currentUserId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [currentUserId]);

  // Función de like MEJORADA para no recargar la vista
  const handleLikePost = useCallback(
    async (postId: string) => {
      if (!currentUserId) return;

      // Solo hacemos la llamada API en segundo plano
      // NO actualizamos el estado global para evitar recargas
      try {
        const post = posts.find(p => p._id === postId);
        if (post) {
          const ok = post.user_has_liked
            ? await apiService.unlikePost(postId, currentUserId)
            : await apiService.likePost(postId, currentUserId);

          if (!ok) {
            console.error("Error en la API de like");
          }
        }
      } catch (err) {
        console.error("Error en handleLikePost:", err);
      }
      // NO actualizamos el estado global - cada PostCard maneja su propio estado
    },
    [currentUserId, posts]
  );

  // Función de save MEJORADA para no recargar la vista
  const handleSavePost = useCallback(async (postId: string) => {
    console.log("Guardar post:", postId);
    // Solo log, no actualizar estado global
  }, []);

  const handleProfilePress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const handleComment = (postId: string) => {
    router.push(`/comments/${postId}`);
  };

  const handlePostPress = (post: Post) => {
    setSelectedPost(post);
  };

  const closeModal = () => {
    setSelectedPost(null);
  };

  const ListHeader = () => (
    <>
      <HeroSection />
      <PromoCard />
      <HeroImageSection />
      {currentUserId && (
        <MasonryLayout
          posts={posts}
          onLike={handleLikePost}
          onSave={handleSavePost}
          onComment={handleComment}
          onProfilePress={handleProfilePress}
          onPostPress={handlePostPress}
        />
      )}
      <HeroImageSection2 />
      <SeccionOption />
    </>
  );

  if (!currentUserId) {
    return (
      <View className="flex-1 bg-[#f6f2e7] justify-center items-center">
        <ActivityIndicator size="large" color="#8B4513" />
        <Text className="mt-4 text-gray-500 text-base">
          Cargando usuario...
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#f6f2e7]">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8B4513" />
          <Text className="mt-4 text-gray-500 text-base">
            Cargando contenido...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-[#f6f2e7]">
        <View className="flex-1 justify-center items-center p-10">
          <Text className="text-gray-500 text-base text-center mb-5">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchAllData}
            className="bg-[#8B4513] px-6 py-3 rounded-lg"
          >
            <Text className="text-white text-base font-semibold">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f6f2e7]">
      <FlatList
        data={[1]}
        keyExtractor={(item, index) => String(index)}
        renderItem={() => null}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={<View className="h-32" />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B4513"
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={closeModal}
          onLike={handleLikePost}
          onSave={handleSavePost}
          onComment={handleComment}
          onProfilePress={handleProfilePress}
        />
      )}
    </View>
  );
};

export default Home;