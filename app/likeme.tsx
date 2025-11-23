import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import React, { useState, useEffect } from 'react';
import { 
  FlatList, 
  RefreshControl, 
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const API_URL = 'http://192.168.0.107:4000/api/v1/posts';

// Interfaces
interface ApiPost {
  _id: string;
  usuariaId: {
    _id: string;
    nombre: string;
    fotoDePerfil: string;
  };
  imagenUrl: string;
  descripcion: string;
  etiqueta: string;
  aprobado: boolean;
  fecha: string;
}

interface Like {
  _id: string;
  postId: ApiPost;
  usuariaId: string;
  fecha: string;
}

interface Post {
  _id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  image_url: string;
  description: string;
  created_at: string;
  category?: string;
  etiqueta?: string;
  mood?: string;
}

// Tema minimalista
const theme = {
  bg: 'bg-white',
  border: 'border-gray-200',
  accent: 'text-gray-900',
  bgAccent: 'bg-gray-100',
  textSecondary: 'text-gray-600',
  textTertiary: 'text-gray-500'
};

export default function LikesScreen() {
  const router = useRouter();
  const usuariaId = '67daf51df4ed8050c7b72619';

  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const postMoods = [
    "Inspiración diaria",
    "Estilo único", 
    "Tendencia favorita",
    "Detalle especial",
    "Elegancia atemporal",
    "Frescura natural",
    "Looks que enamoran",
    "Joya en mi colección"
  ];

  const transformApiPostToAppPost = (apiPost: ApiPost, index: number): Post => {
    const categoryMap: { [key: string]: string } = {
      'comprado': 'Comprado',
      'rentado': 'Rentado', 
      'propio': 'Estilo Propio',
      'nuevo': 'Nuevo'
    };

    return {
      _id: apiPost._id,
      user_id: apiPost.usuariaId._id,
      user_name: apiPost.usuariaId.nombre,
      user_avatar: apiPost.usuariaId.fotoDePerfil,
      image_url: apiPost.imagenUrl,
      description: apiPost.descripcion,
      created_at: apiPost.fecha,
      category: categoryMap[apiPost.etiqueta] || 'Estilo',
      etiqueta: apiPost.etiqueta,
      mood: postMoods[index % postMoods.length]
    };
  };

  const loadLikes = async () => {
    try {
      const response = await fetch(`${API_URL}/likes/${usuariaId}`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      
      const data: Like[] = await response.json();
      const posts = data.map((like: Like, index: number) => 
        transformApiPostToAppPost(like.postId, index)
      );
      setLikedPosts(posts);
    } catch (error) {
      console.error('Error loading likes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLikes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLikes();
  };

  const handleUnlike = async (postId: string) => {
    try {
      const response = await fetch(`${API_URL}/likes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, usuariaId }),
      });

      if (response.ok) {
        setLikedPosts(prev => prev.filter(p => p._id !== postId));
      }
    } catch (error) {
      console.error('Error removing like:', error);
    }
  };

  const getTimeAgo = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    if (diff < 60) return 'Justo ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} días`;
  };

  const handlePostPress = (post: Post) => {
    console.log('Ver detalles del post:', post._id);
  };

  const PostCard = ({ post, onLike, onPress }: {
    post: Post;
    onLike: (id: string) => void;
    onPress: (post: Post) => void;
  }) => {
    return (
      <TouchableOpacity 
        onPress={() => onPress(post)}
        className={`${theme.bg} ${theme.border} mx-4 mb-4 rounded-2xl overflow-hidden border shadow-sm`}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 pb-3">
          <View className="flex-row items-center flex-1">
            <Image 
              source={{ uri: post.user_avatar }} 
              className="w-9 h-9 rounded-full bg-gray-200" 
            />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-gray-900">{post.user_name}</Text>
              <Text className={`text-xs mt-0.5 ${theme.textTertiary}`}>
                {getTimeAgo(post.created_at)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={() => onLike(post._id)}
            className="w-8 h-8 rounded-full justify-center items-center border border-gray-300"
          >
            <Feather name="heart" size={16} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Imagen */}
        <View className="relative">
          <Image
            source={{ uri: post.image_url }}
            className="w-full h-48 bg-gray-100"
            resizeMode="cover"
          />
          <View className="absolute bottom-0 left-0 right-0 py-2 px-4 items-center bg-white/70">
            <Text className={`text-xs font-semibold ${theme.accent}`}>
              {post.mood}
            </Text>
          </View>
        </View>

        {/* Descripción */}
        <View className="p-4">
          <View className="self-start px-2 py-1 rounded-full bg-gray-100 mb-2">
            <Text className={`text-xs font-bold uppercase ${theme.accent}`}>
              {post.category}
            </Text>
          </View>
          
          <Text className="text-sm text-gray-700 leading-5 mb-2" numberOfLines={2}>
            {post.description}
          </Text>

          {post.etiqueta && (
            <View className="flex-row items-center">
              <Feather name="tag" size={12} color="#6b7280" />
              <Text className={`text-xs font-medium ml-1 ${theme.textSecondary}`}>
                {post.etiqueta}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#d1d5db" />
        <Text className="mt-4 text-gray-500 text-base">Buscando tus favoritos</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Título simple en lugar de header */}
      <View className="px-5 pt-12 pb-4">
        <Text className="text-2xl font-bold text-gray-900">
          Tus Momentos Favoritos
        </Text>
        <Text className={`text-sm mt-1 ${theme.textTertiary}`}>
          {likedPosts.length} {likedPosts.length === 1 ? 'inspiración guardada' : 'inspiraciones guardadas'}
        </Text>
      </View>

      {/* Lista de posts */}
      <FlatList
        data={likedPosts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostCard 
            post={item}
            onLike={handleUnlike}
            onPress={handlePostPress}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 px-10">
            <Feather name="heart" size={64} color="#d1d5db" />
            <Text className="text-gray-500 text-lg text-center mt-4 mb-2">
              Tus corazones están listos
            </Text>
            <Text className={`text-center ${theme.textTertiary}`}>
              Los looks que te enamoren aparecerán aquí
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6b7280']}
          />
        }
        contentContainerStyle={likedPosts.length === 0 ? { flex: 1 } : { paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}