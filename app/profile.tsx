import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View, ScrollView } from "react-native";
import React, { useState, useEffect } from 'react';
import { 
  RefreshControl, 
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from './environments/environment';

// CORREGIDO: Eliminé el espacio al final de la URL
const API_URL = environment.api + '/posts';

// Interfaces actualizadas según tu respuesta real
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
}

interface ApiPost {
  _id: string;
  usuariaId: string;
  usuaria: Usuaria;
  imagenUrl: string;
  descripcion: string;
  etiqueta: string;
  aprobado: boolean;
  fecha: string;
  __v: number;
  likes: Like[];
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
  aprobado: boolean;
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

// CORRECCIÓN: Función para decodificar token manualmente (sin jwt-decode)
const decodeToken = (token: string): any => {
  try {
    // Un JWT tiene 3 partes: header.payload.signature
    const payloadBase64 = token.split('.')[1];
    // Reemplazar caracteres URL-safe de Base64
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    // Decodificar Base64
    const payloadJson = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(payloadJson);
  } catch (error) {
    console.error('Error decodificando token manualmente:', error);
    return null;
  }
};

// CORRECCIÓN: Obtener ID del usuario desde token manualmente
const getUserIdFromToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("token");
    console.log('Token from AsyncStorage:', token ? 'exists' : 'null');
    
    if (!token) return null;

    const decoded = decodeToken(token);
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
  const [activeTab, setActiveTab] = useState<'publicaciones' | 'likes'>('publicaciones');

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

  const getEstadoPublicacion = (aprobado: boolean): string => {
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

  // FUNCIÓN TRANSFORMADORA ACTUALIZADA - RECIBE CURRENT_USER_ID COMO PARÁMETRO
  const transformApiPostToAppPost = (apiPost: ApiPost, tipo: 'propio' | 'like' = 'propio', currentUserId: string): Post => {
    console.log('Transformando post:', apiPost._id);
    
    // CORREGIDO: Manejo seguro de datos del usuario
    const userName = apiPost.usuaria?.nombre || "Usuario";
    const userAvatar = apiPost.usuaria?.fotoDePerfil || "https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png";
    
    // Determinar si el usuario actual ha dado like a este post - USANDO EL ID DINÁMICO
    const userHasLiked = apiPost.likes.some(like => like.usuariaId === currentUserId);
    
    return {
      _id: apiPost._id,
      user_id: apiPost.usuariaId,
      user_name: userName,
      user_avatar: userAvatar,
      image_url: apiPost.imagenUrl,
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
      if (activeTab === 'publicaciones') {
        setUserPosts(prevPosts => prevPosts.map(post =>
          post._id === postId ? {
            ...post,
            user_has_liked: !currentLikedState,
            likes_count: currentLikedState ? post.likes_count - 1 : post.likes_count + 1
          } : post
        ));
      } else {
        setLikedPosts(prevPosts => prevPosts.map(post =>
          post._id === postId ? {
            ...post,
            user_has_liked: !currentLikedState,
            likes_count: currentLikedState ? post.likes_count - 1 : post.likes_count + 1
          } : post
        ));
      }

      // Llamar a la API CON EL USER_ID DINÁMICO
      const success = currentLikedState 
        ? await apiService.unlikePost(postId, currentUserId)
        : await apiService.likePost(postId, currentUserId);

      if (!success) {
        // Revertir en caso de error
        if (activeTab === 'publicaciones') {
          setUserPosts(prevPosts => prevPosts.map(post =>
            post._id === postId ? {
              ...post,
              user_has_liked: currentLikedState,
              likes_count: currentLikedState ? post.likes_count : post.likes_count - 1
            } : post
          ));
        } else {
          setLikedPosts(prevPosts => prevPosts.map(post =>
            post._id === postId ? {
              ...post,
              user_has_liked: currentLikedState,
              likes_count: currentLikedState ? post.likes_count : post.likes_count - 1
            } : post
          ));
        }
        console.log('Error al actualizar like');
      }

      // Si se quitó el like y estamos en la pestaña de likes, remover el post
      if (currentLikedState && activeTab === 'likes') {
        setTimeout(() => {
          setLikedPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
        }, 300);
      }

    } catch (error) {
      console.error('Error en handleLikePost:', error);
      // Revertir en caso de excepción
      if (activeTab === 'publicaciones') {
        setUserPosts(prevPosts => prevPosts.map(post =>
          post._id === postId ? {
            ...post,
            user_has_liked: currentLikedState,
            likes_count: currentLikedState ? post.likes_count : post.likes_count - 1
          } : post
        ));
      } else {
        setLikedPosts(prevPosts => prevPosts.map(post =>
          post._id === postId ? {
            ...post,
            user_has_liked: currentLikedState,
            likes_count: currentLikedState ? post.likes_count : post.likes_count - 1
          } : post
        ));
      }
    }
  };

  const loadUserPosts = async () => {
    if (!currentUserId) return;

    try {
      console.log('Cargando posts del usuario...');
      // CORREGIDO: Endpoint correcto según tu log - USANDO EL ID DINÁMICO
      const response = await fetch(`${API_URL}/posts-usuario/${currentUserId}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data: ApiPost[] = await response.json();
      console.log('Posts recibidos:', data.length);
      
      // PASAR EL CURRENT_USER_ID A LA FUNCIÓN TRANSFORMADORA
      const posts = data.map(post => transformApiPostToAppPost(post, 'propio', currentUserId));
      console.log('Posts transformados:', posts.length);
      setUserPosts(posts);

      // Obtener datos del usuario desde el primer post
      if (data.length > 0 && data[0].usuaria) {
        const userFromPost = data[0].usuaria;
        setUserData({
          _id: userFromPost._id,
          nombre: userFromPost.nombre,
          fotoDePerfil: userFromPost.fotoDePerfil,
          email: userFromPost.email
        });
        console.log('Datos del usuario cargados:', userFromPost.nombre);
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  };

  const loadLikedPosts = async () => {
    if (!currentUserId) return;

    try {
      console.log('Cargando posts con like...');
      // CORREGIDO: Endpoint para posts con like - USANDO EL ID DINÁMICO
      const response = await fetch(`${API_URL}/posts-con-like/${currentUserId}`);
      
      if (!response.ok) {
        console.log(`Endpoint de likes no disponible: ${response.status}`);
        setLikedPosts([]);
        return;
      }
      
      const data: ApiPost[] = await response.json();
      console.log('Posts con like recibidos:', data.length);
      
      // PASAR EL CURRENT_USER_ID A LA FUNCIÓN TRANSFORMADORA
      const posts = data.map(post => transformApiPostToAppPost(post, 'like', currentUserId));
      setLikedPosts(posts);
    } catch (error) {
      console.error('Error loading liked posts:', error);
      // En caso de error, establecer array vacío
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      loadAllData();
    }
  }, [currentUserId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Componente PostCard con manejo de errores de imagen Y BOTÓN DE LIKE
  const PostCard = ({ post }: { post: Post }) => {
    const [imageError, setImageError] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    const defaultImage = "https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png";
    const defaultAvatar = "https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png";

    const handleLikePress = () => {
      handleLikePost(post._id, post.user_has_liked);
    };

    return (
      <View className="w-full mb-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header con avatar y nombre */}
        <View className="flex-row items-center p-4 border-b border-gray-100">
          <Image
            source={{ uri: avatarError ? defaultAvatar : post.user_avatar }}
            className="w-10 h-10 rounded-full bg-gray-200"
            onError={() => setAvatarError(true)}
          />
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {post.user_name}
            </Text>
            <Text className="text-xs text-gray-500">
              {new Date(post.created_at).toLocaleDateString()}
            </Text>
          </View>
          {post.tipo === 'propio' && (
            <View className={`px-3 py-1 rounded-full ${getColorEstado(post.estado)}`}>
              <Text className="text-xs font-medium">{post.estado}</Text>
            </View>
          )}
          {post.tipo === 'like' && (
            <View className="flex-row items-center">
              <Feather name="heart" size={16} color="#ef4444" />
              <Text className="text-xs text-gray-500 ml-1">Te gusta</Text>
            </View>
          )}
        </View>

        {/* Imagen del post con manejo de error */}
        <Image
          source={{ uri: imageError ? defaultImage : post.image_url }}
          className="w-full h-64 bg-gray-100"
          resizeMode="cover"
          onError={() => {
            console.log('Error cargando imagen:', post.image_url);
            setImageError(true);
          }}
        />

        {/* Descripción y estadísticas */}
        <View className="p-4">
          <Text className="text-sm text-gray-800 leading-5 mb-2">
            {post.description}
          </Text>
          
          {/* Estadísticas del post CON BOTÓN DE LIKE INTERACTIVO */}
          <View className="flex-row items-center justify-between border-t border-gray-100 pt-2">
            <View className="flex-row items-center">
              <TouchableOpacity 
                onPress={handleLikePress}
                className="flex-row items-center"
              >
                <Feather 
                  name={post.user_has_liked ? "heart" : "heart"} 
                  size={16} 
                  color={post.user_has_liked ? "#ef4444" : "#9ca3af"} 
                  fill={post.user_has_liked ? "#ef4444" : "none"}
                />
                <Text className={`text-xs ml-1 ${
                  post.user_has_liked ? "text-red-500 font-semibold" : "text-gray-600"
                }`}>
                  {post.likes_count}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center">
              <Feather name="message-circle" size={14} color="#6b7280" />
              <Text className="text-xs text-gray-600 ml-1">
                {post.comments_count}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Feather name="clock" size={14} color="#6b7280" />
              <Text className="text-xs text-gray-600 ml-1">
                {new Date(post.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short'
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (!currentUserId) {
    return (
      <View className="flex-1 justify-center items-center bg-[#f6f2e7]">
        <ActivityIndicator size="large" color="#6b7280" />
        <Text className="mt-4 text-gray-500 text-base">Cargando usuario...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#f6f2e7]">
        <ActivityIndicator size="large" color="#6b7280" />
        <Text className="mt-4 text-gray-500 text-base">Cargando perfil</Text>
      </View>
    );
  }

  const postsAprobados = userPosts.filter(post => post.aprobado === true).length;
  const postsPendientes = userPosts.filter(post => post.aprobado === null).length;
  const postsRechazados = userPosts.filter(post => post.aprobado === false).length;

  const currentPosts = activeTab === 'publicaciones' ? userPosts : likedPosts;

  return (
    <ScrollView 
      className="flex-1 bg-[#f6f2e7]"
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#6b7280']}
        />
      }
    >
      {/* Header del perfil */}
      <View className="bg-white px-5 pt-12 pb-6 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-3xl font-bold text-gray-900">PERFIL</Text>
          <Image 
            source={{ uri: userData?.fotoDePerfil }} 
            className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white"
          />
        </View>

        {/* Información del usuario */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-1">
            {userData?.nombre || "Cargando..."}
          </Text>
          <Text className="text-sm text-gray-600">
            {userData?.email || "Miembro de la comunidad"}
          </Text>
        </View>

        {/* Estadísticas */}
        <View className="flex-row justify-between mb-6">
          <View className="items-center">
            <Text className="text-2xl font-bold text-gray-900">
              {userPosts.length}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">Publicaciones</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {postsAprobados}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">Aprobados</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {postsPendientes}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">Pendientes</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">
              {postsRechazados}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">No aprobados</Text>
          </View>
        </View>

        {/* Botones de acción */}
        <View className="flex-row space-x-3">
          <TouchableOpacity 
            className="flex-1 py-3 bg-gray-900 rounded-lg items-center"
            activeOpacity={0.8}
          >
            <Text className="text-sm font-semibold text-white">
              Editar perfil
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 py-3 bg-white border border-gray-900 rounded-lg items-center"
            activeOpacity={0.8}
            onPress={() => router.push('/crear-post')}
          >
            <Text className="text-sm font-semibold text-gray-900">
              Crear post
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs de navegación */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row">
          <TouchableOpacity
            className={`flex-1 py-4 items-center ${
              activeTab === 'publicaciones' 
                ? 'border-b-2 border-gray-900' 
                : ''
            }`}
            onPress={() => setActiveTab('publicaciones')}
          >
            <Text 
              className={`text-sm font-semibold ${
                activeTab === 'publicaciones' 
                  ? 'text-gray-900' 
                  : 'text-gray-500'
              }`}
            >
              Mis Publicaciones ({userPosts.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className={`flex-1 py-4 items-center ${
              activeTab === 'likes' 
                ? 'border-b-2 border-gray-900' 
                : ''
            }`}
            onPress={() => setActiveTab('likes')}
          >
            <Text 
              className={`text-sm font-semibold ${
                activeTab === 'likes' 
                  ? 'text-gray-900' 
                  : 'text-gray-500'
              }`}
            >
              Me gustan ({likedPosts.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de publicaciones */}
      <View className="p-4">
        {currentPosts.length === 0 ? (
          <View className="items-center justify-center py-12">
            {activeTab === 'publicaciones' ? (
              <>
                <Feather name="image" size={48} color="#d1d5db" />
                <Text className="text-gray-500 text-lg text-center mt-4 mb-2">
                  No tienes publicaciones
                </Text>
                <Text className="text-gray-400 text-center">
                  Crea tu primera publicación para compartir con la comunidad
                </Text>
              </>
            ) : (
              <>
                <Feather name="heart" size={48} color="#d1d5db" />
                <Text className="text-gray-500 text-lg text-center mt-4 mb-2">
                  No tienes publicaciones favoritas
                </Text>
                <Text className="text-gray-400 text-center">
                  Dale like a las publicaciones que te gusten para verlas aquí
                </Text>
              </>
            )}
          </View>
        ) : (
          currentPosts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))
        )}
      </View>
    </ScrollView>
  );
}