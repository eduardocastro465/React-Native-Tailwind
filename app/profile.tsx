import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View, ScrollView } from "react-native";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshControl, 
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../src/environments/environment';
import { jwtDecode } from 'jwt-decode';

// CORREGIDO: Eliminé el espacio al final de la URL
const API_URL = environment.api + '/posts';

// Interfaces actualizadas según la nueva estructura de datos
interface Usuaria {
  _id: string;
  nombre: string;
  email: string;
  telefono: string;
  fotoDePerfil: string;
  apellidos: string;
  direccion: string;
  edad: number;
  isClienteFrecuente: boolean;
  isNuevo: boolean;
  localidad: string;
}

interface Like {
  _id: string;
  postId: string;
  usuariaId: string;
  fecha: string;
  __v: number;
}

interface ApiPost {
  _id: string;
  usuariaId: string;
  usuaria: Usuaria;
  imagenUrls?: string[]; // Cambiado: ahora es opcional y puede ser array
  imagenUrl?: string; // Mantenido por compatibilidad
  descripcion: string;
  etiqueta: string;
  aprobado: boolean | null;
  fecha: string;
  __v: number;
  likes: Like[];
  likeDeUsuaria?: Like[]; // Nuevo campo en la respuesta
  hasLiked?: boolean; // Nuevo campo en la respuesta
  comentarios: any[];
  guardados: any[];
  likesCount: number;
  comentariosCount: number;
  guardadosCount: number;
}

interface Post {
  _id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  image_url: string;
  description: string;
  created_at: string;
  aprobado: boolean | null;
  estado: string;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  tipo?: 'propio' | 'like';
}

interface UserData {
  _id: string;
  nombre: string;
  fotoDePerfil: string;
  email?: string;
}

// CORRECCIÓN: Usar jwt-decode para decodificar el token
const getUserIdFromToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("token");
    console.log('Token from AsyncStorage:', token ? 'exists' : 'null');
    
    if (!token) return null;

    const decoded = jwtDecode<{ _id: string }>(token);
    console.log('Decoded token:', decoded);
    
    return decoded?._id || null;
  } catch (error) {
    console.error("Error decodificando token:", error);
    return null;
  }
};

// Servicio para obtener datos del usuario
const getUserData = async (): Promise<UserData | null> => {
  try {
    const userDataString = await AsyncStorage.getItem('userData');
    console.log('userDataString from AsyncStorage:', userDataString);
    
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      console.log('Parsed userData:', userData);
      return userData;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo datos del usuario:', error);
    return null;
  }
};

// Servicio de API para likes - AHORA RECIBE USER_ID COMO PARÁMETRO
const apiService = {
  likePost: async (postId: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/${userId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          usuariaId: userId
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error liking post:', error);
      return false;
    }
  },

  unlikePost: async (postId: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/${userId}/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          usuariaId: userId
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error unliking post:', error);
      return false;
    }
  },
};

export default function ProfileScreen() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // CORRECCIÓN: Obtener el ID del usuario actual al cargar el componente
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('Cargando datos del usuario...');
        
        // Primero intentar desde userData
        const userData = await getUserData();
        console.log('UserData obtenido:', userData);
        
        if (userData && userData._id) {
          console.log('User ID cargado desde userData:', userData._id);
          setCurrentUserId(userData._id);
          setUserData(userData);
          return;
        }

        // Si no funciona, intentar desde el token
        console.log('Intentando obtener ID desde token...');
        const userIdFromToken = await getUserIdFromToken();
        console.log('User ID desde token:', userIdFromToken);
        
        if (userIdFromToken) {
          setCurrentUserId(userIdFromToken);
          return;
        }

        // Si nada funciona, redirigir al login
        console.log('No se pudo obtener el ID del usuario, redirigiendo al login');
        router.push('/login');
        
      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        router.push('/login');
      }
    };

    loadUserData();
  }, []);

  const getEstadoPublicacion = (aprobado: boolean | null): string => {
    if (aprobado === true) return "Aprobado";
    if (aprobado === false) return "No aprobado";
    return "Pendiente";
  };

  const getColorEstado = (estado: string): string => {
    switch (estado) {
      case "Aprobado": return "bg-green-100 text-green-800";
      case "No aprobado": return "bg-red-100 text-red-800";
      case "Pendiente": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // FUNCIÓN TRANSFORMADORA ACTUALIZADA - MANEJA NUEVA ESTRUCTURA
  const transformApiPostToAppPost = (apiPost: ApiPost, tipo: 'propio' | 'like' = 'propio', currentUserId: string): Post => {
    console.log('Transformando post:', apiPost._id);
    
    // CORREGIDO: Manejo seguro de datos del usuario
    const userName = apiPost.usuaria?.nombre || "Usuario";
    const userAvatar = apiPost.usuaria?.fotoDePerfil || "https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png";
    
    // CORREGIDO: Manejo de imágenes - usar imagenUrls si existe, sino imagenUrl
    const imageUrl = apiPost.imagenUrls && apiPost.imagenUrls.length > 0 
      ? apiPost.imagenUrls[0] 
      : (apiPost.imagenUrl || "https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png");
    
    // CORREGIDO: Determinar si el usuario actual ha dado like a este post
    // Primero usar hasLiked si está disponible, sino usar likeDeUsuaria, sino usar likes
    let userHasLiked = false;
    
    if (apiPost.hasLiked !== undefined) {
      userHasLiked = apiPost.hasLiked;
    } else if (apiPost.likeDeUsuaria && apiPost.likeDeUsuaria.length > 0) {
      userHasLiked = apiPost.likeDeUsuaria.some(like => like.usuariaId === currentUserId);
    } else {
      userHasLiked = apiPost.likes.some(like => like.usuariaId === currentUserId);
    }
    
    return {
      _id: apiPost._id,
      user_id: apiPost.usuariaId,
      user_name: userName,
      user_avatar: userAvatar,
      image_url: imageUrl,
      description: apiPost.descripcion,
      created_at: apiPost.fecha,
      aprobado: apiPost.aprobado,
      estado: getEstadoPublicacion(apiPost.aprobado),
      likes_count: apiPost.likesCount || 0,
      comments_count: apiPost.comentariosCount || 0,
      user_has_liked: userHasLiked,
      tipo
    };
  };

  // FUNCIÓN CORREGIDA: Manejo de like/dislike con ID dinámico
  const handleLikePost = async (postId: string, currentLikedState: boolean) => {
    if (!currentUserId) {
      console.error('No hay usuario autenticado');
      return;
    }

    try {
      // Actualización optimista inmediata
      setUserPosts(prevPosts => prevPosts.map(post =>
        post._id === postId ? {
          ...post,
          user_has_liked: !currentLikedState,
          likes_count: currentLikedState ? post.likes_count - 1 : post.likes_count + 1
        } : post
      ));

      setLikedPosts(prevPosts => prevPosts.map(post =>
        post._id === postId ? {
          ...post,
          user_has_liked: !currentLikedState,
          likes_count: currentLikedState ? post.likes_count - 1 : post.likes_count + 1
        } : post
      ));

      // Llamar a la API CON EL USER_ID DINÁMICO
      const success = currentLikedState 
        ? await apiService.unlikePost(postId, currentUserId)
        : await apiService.likePost(postId, currentUserId);

      if (!success) {
        // Revertir en caso de error
        setUserPosts(prevPosts => prevPosts.map(post =>
          post._id === postId ? {
            ...post,
            user_has_liked: currentLikedState,
            likes_count: currentLikedState ? post.likes_count : post.likes_count - 1
          } : post
        ));

        setLikedPosts(prevPosts => prevPosts.map(post =>
          post._id === postId ? {
            ...post,
            user_has_liked: currentLikedState,
            likes_count: currentLikedState ? post.likes_count : post.likes_count - 1
          } : post
        ));
        console.log('Error al actualizar like');
      }

      // Si se quitó el like y estamos en la pestaña de likes, remover el post
      if (currentLikedState) {
        setTimeout(() => {
          setLikedPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
        }, 300);
      }

    } catch (error) {
      console.error('Error en handleLikePost:', error);
      // Revertir en caso de excepción
      setUserPosts(prevPosts => prevPosts.map(post =>
        post._id === postId ? {
          ...post,
          user_has_liked: currentLikedState,
          likes_count: currentLikedState ? post.likes_count : post.likes_count - 1
        } : post
      ));

      setLikedPosts(prevPosts => prevPosts.map(post =>
        post._id === postId ? {
          ...post,
          user_has_liked: currentLikedState,
          likes_count: currentLikedState ? post.likes_count : post.likes_count - 1
        } : post
      ));
    }
  };

  const loadUserPosts = async () => {
    if (!currentUserId) return;

    try {
      console.log('Cargando posts del usuario...');
      const response = await fetch(`${API_URL}/posts-usuario/${currentUserId}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data: ApiPost[] = await response.json();
      console.log('Posts del usuario recibidos:', data.length);
      
      const posts = data.map(post => transformApiPostToAppPost(post, 'propio', currentUserId));
      console.log('Posts del usuario transformados:', posts.length);
      setUserPosts(posts);

      if (data.length > 0 && data[0].usuaria) {
        const userFromPost = data[0].usuaria;
        setUserData({
          _id: userFromPost._id,
          nombre: userFromPost.nombre,
          fotoDePerfil: userFromPost.fotoDePerfil,
          email: userFromPost.email
        });
        console.log('Datos del usuario cargados desde posts:', userFromPost.nombre);
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  };

  const loadLikedPosts = async () => {
    if (!currentUserId) return;

    try {
      console.log('Cargando posts con like...');
      const response = await fetch(`${API_URL}/posts-con-like/${currentUserId}`);
      
      if (!response.ok) {
        console.log(`Endpoint de likes no disponible: ${response.status}`);
        setLikedPosts([]);
        return;
      }
      
      const data: ApiPost[] = await response.json();
      console.log('Posts con like recibidos:', data.length);
      
      const posts = data.map(post => transformApiPostToAppPost(post, 'like', currentUserId));
      setLikedPosts(posts);
    } catch (error) {
      console.error('Error loading liked posts:', error);
      setLikedPosts([]);
    }
  };

  const loadAllData = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      await Promise.all([
        loadUserPosts(), 
        loadLikedPosts()
      ]);
    } catch (error) {
      console.error('Error en loadAllData:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      loadAllData();
    }
  }, [currentUserId]);

  // Componente PostCard con manejo de errores de imagen Y BOTÓN DE LIKE
  const PostCard = ({ post }: { post: Post }) => {
    const [imageError, setImageError] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    const defaultImage = "https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png";
    const defaultAvatar = "https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png";

    const handleLikePress = () => {
      handleLikePost(post._id, post.user_has_liked);
    };

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          return 'Hoy';
        } else if (diffDays === 1) {
          return 'Ayer';
        } else if (diffDays < 7) {
          return `Hace ${diffDays}d`;
        } else {
          return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        }
      } catch (error) {
        return dateString;
      }
    };

    return (
      <View className="w-48 mr-4 bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header con avatar y nombre */}
        <View className="flex-row items-center p-2 border-b border-gray-200">
          <Image
            source={{ uri: avatarError ? defaultAvatar : post.user_avatar }}
            className="w-8 h-8 rounded-full bg-gray-200"
            onError={() => setAvatarError(true)}
          />
          <View className="ml-2 flex-1">
            <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
              {post.user_name}
            </Text>
            <Text className="text-xs text-gray-500">
              {formatDate(post.created_at)}
            </Text>
          </View>
          {post.tipo === 'propio' && (
            <View className={`px-2 py-1 rounded-full ${getColorEstado(post.estado)}`}>
              <Text className="text-xs font-medium">{post.estado}</Text>
            </View>
          )}
          {post.tipo === 'like' && (
            <View className="flex-row items-center">
              <Feather name="heart" size={14} color="#DB2777" />
              <Text className="text-xs text-gray-500 ml-1">Te gusta</Text>
            </View>
          )}
        </View>

        {/* Imagen del post con manejo de error */}
        <Image
          source={{ uri: imageError ? defaultImage : post.image_url }}
          className="w-full h-32 bg-gray-100"
          resizeMode="cover"
          onError={() => {
            console.log('Error cargando imagen:', post.image_url);
            setImageError(true);
          }}
        />

        {/* Descripción y estadísticas */}
        <View className="p-2">
          <Text className="text-xs text-gray-800 leading-4 mb-2" numberOfLines={2}>
            {post.description}
          </Text>
          
          {/* Estadísticas del post CON BOTÓN DE LIKE INTERACTIVO */}
          <View className="flex-row items-center justify-between border-t border-gray-200 pt-2">
            <View className="flex-row items-center">
              <TouchableOpacity 
                onPress={handleLikePress}
                className="flex-row items-center"
              >
                <Feather 
                  name={post.user_has_liked ? "heart" : "heart"} 
                  size={14} 
                  color={post.user_has_liked ? "#DB2777" : "#9ca3af"} 
                  fill={post.user_has_liked ? "#DB2777" : "none"}
                />
                <Text className={`text-xs ml-1 ${
                  post.user_has_liked ? "text-rosa-suave font-semibold" : "text-gray-600"
                }`}>
                  {post.likes_count}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center">
              <Feather name="message-circle" size={12} color="#6b7280" />
              <Text className="text-xs text-gray-600 ml-1">
                {post.comments_count}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Feather name="clock" size={12} color="#6b7280" />
              <Text className="text-xs text-gray-600 ml-1">
                {formatDate(post.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (!currentUserId) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#6b7280" />
        <Text className="mt-4 text-gray-500 text-base">Cargando usuario...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#6b7280" />
        <Text className="mt-4 text-gray-500 text-base">Cargando perfil</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header del perfil */}
      <View className="bg-white px-5 pt-12 pb-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-3xl font-bold text-gray-800">PERFIL</Text>
          <Image 
            source={{ uri: userData?.fotoDePerfil || "https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png" }} 
            className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white"
          />
        </View>

        {/* Información del usuario */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-1">
            {userData?.nombre || "Usuario"}
          </Text>
          <Text className="text-sm text-gray-500">
            {userData?.email || "Miembro de la comunidad"}
          </Text>
        </View>

        {/* Estadísticas */}
        <View className="flex-row justify-between mb-6">
          <View className="items-center">
            <Text className="text-2xl font-bold text-gray-800">
              {userPosts.length}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">Publicaciones</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {userPosts.filter(post => post.aprobado === true).length}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">Aprobados</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {userPosts.filter(post => post.aprobado === null).length}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">Pendientes</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">
              {userPosts.filter(post => post.aprobado === false).length}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">No aprobados</Text>
          </View>
        </View>

        {/* Botones de acción */}
        <View className="flex-row space-x-3 gap-2">
          <TouchableOpacity 
            className="flex-1 py-3 bg-blue-500 rounded-lg items-center"
            activeOpacity={0.8}
            onPress={() => router.push('/profile-edit')}
          >
            <Text className="text-sm font-semibold text-white">
              Editar perfil
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 py-3 bg-blue-500 rounded-lg items-center"
            activeOpacity={0.8}
            onPress={() => router.push('/crear-post')}
          >
            <Text className="text-sm font-semibold text-white">
              Crear post
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sección de Publicaciones */}
      <View className="px-4 py-6">
        <Text className="text-2xl font-bold text-gray-800 mb-4">Mis Publicaciones</Text>
        <View className="bg-gray-200 p-4 rounded-lg">
          {userPosts.length > 0 ? (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 8 }}
            >
              {userPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </ScrollView>
          ) : (
            <View className="items-center justify-center py-8">
              <Feather name="camera" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-sm mt-3">No tienes publicaciones aún</Text>
              <TouchableOpacity 
                onPress={() => router.push('/crear-post')}
                className="mt-2 bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white text-sm font-medium">Crear primera publicación</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Sección de Me gustan */}
      <View className="px-4 py-6">
        <Text className="text-2xl font-bold text-gray-800 mb-4">Me gustan</Text>
        <View className="bg-gray-200 p-4 rounded-lg">
          {likedPosts.length > 0 ? (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 8 }}
            >
              {likedPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </ScrollView>
          ) : (
            <View className="items-center justify-center py-8">
              <Feather name="heart" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-sm mt-3">No tienes likes aún</Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                Dale like a las publicaciones que te gusten
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}