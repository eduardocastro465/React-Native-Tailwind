import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- DEPENDENCIAS DE EXPO ---
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../src/environments/environment';

// --- INTERFACES ---
interface PostFormData {
  imagenesUris: string[];
  descripcion: string;
  etiqueta: 'comprado' | 'rentado' | 'propio';
  tags: string[];
  collections: string[];
  shoppingLinks: { nombre: string; url: string }[];
}

interface UserData {
  _id: string;
  nombre: string;
  fotoDePerfil: string;
  email?: string;
}

// --- CONFIG ---
const API_URL = environment.api + '/posts/crear';
const ETIQUETAS = ['propio', 'comprado', 'rentado'];
const COLECCIONES_PREDEFINIDAS = ['Verano', 'Invierno', 'Ocasiones', 'Trabajo', 'Casual'];
const MAX_IMAGENES = 10;

// FUNCIONES AUXILIARES DE TOKEN
const decodeToken = (token: string): any => {
  try {
    const payloadBase64 = token.split('.')[1];
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
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

const getUserIdFromToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return null;
    const decoded = decodeToken(token);
    return decoded?._id || null;
  } catch (error) {
    console.error("Error decodificando token:", error);
    return null;
  }
};

const getUserData = async (): Promise<UserData | null> => {
  try {
    const userDataString = await AsyncStorage.getItem('userData');
    if (userDataString) {
      return JSON.parse(userDataString);
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo datos del usuario:', error);
    return null;
  }
};

// --- COMPONENTE PRINCIPAL ---
export default function CrearPostScreen() {
  const router = useRouter();

  // Estados de Usuario
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Estados de Permisos y Carga de Imágenes
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);

  // Estado del Formulario
  const [formData, setFormData] = useState<PostFormData>({
    imagenesUris: [],
    descripcion: '',
    etiqueta: 'propio',
    tags: [],
    collections: [],
    shoppingLinks: [],
  });

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [modalTag, setModalTag] = useState({ visible: false, value: '' });
  const [modalLink, setModalLink] = useState({ visible: false, nombre: '', url: '' });

  // 1. CARGA INICIAL: Usuario + Solicitud de Permisos
  useEffect(() => {
    const init = async () => {
      await loadUserData();
      await requestPermissions();
    };
    init();
  }, []);

  // Lógica de carga de usuario
  const loadUserData = async () => {
    try {
      const userData = await getUserData();
      if (userData && userData._id) {
        setUserData(userData);
      } else {
        const userIdFromToken = await getUserIdFromToken();
        if (userIdFromToken) {
          setUserData({
            _id: userIdFromToken,
            nombre: 'Usuario',
            fotoDePerfil: 'https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png',
            email: ''
          });
        } else {
          Alert.alert('Error', 'No se pudo obtener la información del usuario');
          router.back();
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'Error al cargar información');
      router.back();
    } finally {
      setLoadingUser(false);
    }
  };

  // 2. LÓGICA DE PERMISOS
  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'web') {
        setHasPermission(true);
        return;
      }

      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();

      const allGranted =
        cameraPermission.status === 'granted' &&
        galleryPermission.status === 'granted' &&
        mediaLibraryPermission.status === 'granted';

      setHasPermission(allGranted);

      if (!allGranted) {
        Alert.alert(
          'Permisos necesarios',
          'Necesitas conceder permisos de cámara y galería para subir fotos.',
          [{ text: 'Entendido' }]
        );
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      setHasPermission(false);
    }
  };

  // 3. FUNCIÓN: TOMAR FOTO (Con guardado en galería)
  const takePhoto = async () => {
    if (hasPermission === false) {
      Alert.alert('Permiso denegado', 'Necesitas conceder permisos de cámara.');
      return;
    }

    if (formData.imagenesUris.length >= MAX_IMAGENES) {
      Alert.alert('Límite alcanzado', `Solo puedes subir hasta ${MAX_IMAGENES} imágenes.`);
      return;
    }

    setLoadingCamera(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUri = result.assets[0].uri;

        // Agregar al estado
        setFormData(prev => ({
          ...prev,
          imagenesUris: [...prev.imagenesUris, newUri]
        }));

        // Guardar copia en galería
        await saveToGallery(newUri);
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto.');
    } finally {
      setLoadingCamera(false);
    }
  };

  // 4. FUNCIÓN: SELECCIONAR MÚLTIPLES IMÁGENES DE GALERÍA (CORREGIDO)
  const pickMultipleImages = async () => {
    // Verificar límite
    const remainingSlots = MAX_IMAGENES - formData.imagenesUris.length;
    if (remainingSlots <= 0) {
      Alert.alert('Límite alcanzado', `Solo puedes subir hasta ${MAX_IMAGENES} imágenes.`);
      return;
    }

    // Soporte Web específico (Input file múltiple)
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      
      input.onchange = (e: any) => {
        if (!e.target.files) return;
        
        const files = Array.from(e.target.files);
        const newImages: string[] = [];
        
        // Procesar cada archivo
        files.forEach((file: any) => {
          if (formData.imagenesUris.length + newImages.length >= MAX_IMAGENES) {
            return;
          }
          
          const url = URL.createObjectURL(file);
          newImages.push(url);
        });
        
        if (newImages.length > 0) {
          setFormData(prev => ({
            ...prev,
            imagenesUris: [...prev.imagenesUris, ...newImages]
          }));
        }
        
        // Mostrar mensaje si se excedió el límite
        if (files.length > remainingSlots) {
          Alert.alert(
            'Límite parcial',
            `Se seleccionaron ${files.length} imágenes pero solo se agregaron ${remainingSlots} debido al límite máximo.`
          );
        }
      };
      
      input.click();
      return;
    }

    // Soporte Móvil (Expo Image Picker con múltiple selección)
    if (hasPermission === false) {
      Alert.alert('Permiso denegado', 'Necesitas conceder permisos de galería.');
      return;
    }

    setLoadingGallery(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots, // Límite de selección basado en espacios restantes
        orderedSelection: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(asset => asset.uri);
        
        setFormData(prev => ({
          ...prev,
          imagenesUris: [...prev.imagenesUris, ...newUris]
        }));
      }
    } catch (error) {
      console.error('Error seleccionando imágenes:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes.');
    } finally {
      setLoadingGallery(false);
    }
  };

  // 5. FUNCIÓN: GUARDAR EN GALERÍA (Auxiliar)
  const saveToGallery = async (uri: string) => {
    try {
      if (Platform.OS !== 'web') {
        const asset = await MediaLibrary.createAssetAsync(uri);
        return asset;
      }
    } catch (error) {
      console.error('Error guardando en galería:', error);
    }
  };

  // 6. FUNCIÓN: ARRASTRAR Y SOLTAR PARA REORDENAR (Opcional)
  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...formData.imagenesUris];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    
    setFormData(prev => ({
      ...prev,
      imagenesUris: newImages
    }));
  };

  // --- RESTO DE FUNCIONES (Tags, Links, Submit) ---

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imagenesUris: prev.imagenesUris.filter((_, i) => i !== index)
    }));
  };

  const handleAddTag = () => {
    if (modalTag.value.trim() && !formData.tags.includes(modalTag.value.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, modalTag.value.trim()] }));
      setModalTag({ visible: false, value: '' });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleToggleCollection = (collection: string) => {
    setFormData(prev => ({
      ...prev,
      collections: prev.collections.includes(collection)
        ? prev.collections.filter(c => c !== collection)
        : [...prev.collections, collection],
    }));
  };

  const handleAddLink = () => {
    if (modalLink.nombre.trim() && modalLink.url.trim()) {
      setFormData(prev => ({
        ...prev,
        shoppingLinks: [...prev.shoppingLinks, {
          nombre: modalLink.nombre.trim(),
          url: modalLink.url.trim()
        }],
      }));
      setModalLink({ visible: false, nombre: '', url: '' });
    }
  };

  const handleRemoveLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      shoppingLinks: prev.shoppingLinks.filter((_, i) => i !== index),
    }));
  };

  // 7. FUNCIÓN: ENVIAR POST CON MÚLTIPLES IMÁGENES
  const handleSubmit = async () => {
    if (!userData?._id) {
      Alert.alert("Error", "No se pudo identificar al usuario.");
      return;
    }
    
    if (formData.imagenesUris.length === 0) {
      Alert.alert("Error", "Debes seleccionar al menos una imagen.");
      return;
    }

    setLoadingSubmit(true);
    try {
      const fd = new FormData();
      fd.append("usuariaId", userData._id);
      fd.append("descripcion", formData.descripcion);
      fd.append("etiqueta", formData.etiqueta);
      fd.append("tags", JSON.stringify(formData.tags));
      fd.append("collections", JSON.stringify(formData.collections));
      fd.append("shoppingLinks", JSON.stringify(formData.shoppingLinks));
      
      // Agregar TODAS las imágenes al FormData
      formData.imagenesUris.forEach((uri, index) => {
        // Para web, necesitamos convertir la URL a Blob
        if (Platform.OS === 'web') {
          // En web, las URIs son blob URLs, necesitamos convertirlas a File
          fetch(uri)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], `img_${Date.now()}_${index}.jpg`, { type: "image/jpeg" });
              fd.append("imagenes", file);
            });
        } else {
          // Para móvil (iOS/Android)
          fd.append("imagenes", {
            uri: uri,
            name: `img_${Date.now()}_${index}.jpg`,
            type: "image/jpeg",
          } as any);
        }
      });

      const res = await fetch(API_URL, {
        method: "POST",
        body: fd,
        headers: Platform.OS === 'web' ? {} : {
          'Content-Type': 'multipart/form-data',
        },
      });

      const json = await res.json();
      
      if (!res.ok) {
        Alert.alert("Error", json.error || "Error al publicar");
      } else {
        Alert.alert(
          "¡Éxito!",
          `Look publicado correctamente con ${formData.imagenesUris.length} ${formData.imagenesUris.length === 1 ? 'imagen' : 'imágenes'}.`,
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (err: any) {
      console.error('Error al enviar:', err);
      Alert.alert("Error", err.message || "Error de conexión");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // 8. RENDERIZADO DE IMÁGENES CON MEJOR UI
  const renderImages = () => (
    <View className="flex-row flex-wrap">
      {formData.imagenesUris.map((uri, index) => (
        <View key={index} className="relative mb-3 mr-3">
          <View className="relative">
            <Image
              source={{ uri }}
              className="w-24 h-24 rounded-lg"
              resizeMode="cover"
            />
            {/* Badge con número de imagen */}
            <View className="absolute top-1 left-1 bg-black/60 rounded-full w-6 h-6 items-center justify-center">
              <Text className="text-white text-xs font-bold">{index + 1}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleRemoveImage(index)}
            className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 items-center justify-center shadow-sm"
          >
            <Ionicons name="close-circle" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ))}
      
      {formData.imagenesUris.length === 0 && (
        <View className="w-full items-center justify-center py-8">
          <Ionicons name="images-outline" size={48} color="#D1D5DB" />
          <Text className="text-gray-400 text-sm italic text-center mt-2">
            No hay imágenes seleccionadas
          </Text>
          <Text className="text-gray-400 text-xs text-center mt-1">
            Toca "Galería" para seleccionar múltiples imágenes
          </Text>
        </View>
      )}
    </View>
  );

  if (loadingUser) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-4 text-gray-600">Cargando...</Text>
        </View>
      </View>
    );
  }

  const imageCount = formData.imagenesUris.length;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* HEADER */}
        <View className="bg-white px-4 py-3 flex-row justify-between items-center border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Crear Post</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* SECCIÓN DE IMÁGENES */}
        <View className="p-4 bg-white mb-3 mt-2">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-base font-semibold text-gray-900">Imágenes</Text>
              <Text className="text-xs text-gray-500 mt-1">
                {imageCount > 0 ? `${imageCount} de ${MAX_IMAGENES} imágenes` : `Máximo ${MAX_IMAGENES} imágenes`}
              </Text>
            </View>
            {imageCount > 0 && (
              <TouchableOpacity
                onPress={() => setFormData(prev => ({ ...prev, imagenesUris: [] }))}
                className="flex-row items-center bg-red-50 px-3 py-1.5 rounded-full"
              >
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                <Text className="text-red-600 text-xs font-medium ml-1">Eliminar todas</Text>
              </TouchableOpacity>
            )}
          </View>

          {renderImages()}

          {/* BOTONES DE CÁMARA Y GALERÍA */}
          {imageCount < MAX_IMAGENES && (
            <View className="flex-row gap-3 mt-3">
              {/* Botón Galería - MÚLTIPLES IMÁGENES */}
              <TouchableOpacity
                onPress={pickMultipleImages}
                className="flex-1 flex-row items-center justify-center bg-blue-500 py-3 rounded-lg shadow-sm"
                disabled={loadingGallery}
              >
                {loadingGallery ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="images" size={20} color="#FFFFFF" />
                    <Text className="text-white text-sm font-medium ml-2">
                      {Platform.OS === 'web' ? 'Seleccionar imágenes' : 'Galería (múltiples)'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Botón Cámara (Solo móvil) */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  onPress={takePhoto}
                  className="flex-1 flex-row items-center justify-center border border-gray-300 py-3 rounded-lg"
                  disabled={loadingCamera}
                >
                  {loadingCamera ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={20} color="#111827" />
                      <Text className="text-gray-900 text-sm font-medium ml-2">Cámara</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {imageCount >= MAX_IMAGENES && (
            <View className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Text className="text-yellow-800 text-sm text-center">
                🎉 ¡Has alcanzado el límite máximo de {MAX_IMAGENES} imágenes!
              </Text>
              <Text className="text-yellow-600 text-xs text-center mt-1">
                Elimina algunas imágenes si quieres agregar más.
              </Text>
            </View>
          )}
        </View>

        {/* DESCRIPCIÓN */}
        <View className="p-4 bg-white mb-3">
          <Text className="text-base font-semibold text-gray-900 mb-2">Descripción</Text>
          <TextInput
            placeholder="Describe tu estilo, ocasión, o lo que más te guste de este look..."
            value={formData.descripcion}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, descripcion: text.substring(0, 300) }))}
            multiline
            maxLength={300}
            className="h-28 p-3 border border-gray-200 rounded-lg text-gray-900 text-sm"
            style={{ textAlignVertical: 'top' }}
            placeholderTextColor="#9CA3AF"
          />
          <Text className="text-xs text-gray-400 text-right mt-1">
            {formData.descripcion.length}/300
          </Text>
        </View>

        {/* TIPO DE LOOK */}
        <View className="p-4 bg-white mb-3">
          <Text className="text-base font-semibold text-gray-900 mb-2">Tipo de look</Text>
          <View className="flex-row gap-2">
            {ETIQUETAS.map((etiqueta) => (
              <TouchableOpacity
                key={etiqueta}
                onPress={() => setFormData((prev) => ({ ...prev, etiqueta: etiqueta as any }))}
                className={`flex-1 py-2 rounded-lg items-center ${formData.etiqueta === etiqueta ? 'bg-blue-500' : 'bg-gray-100'
                  }`}
              >
                <Text className={`text-sm font-medium ${formData.etiqueta === etiqueta ? 'text-white' : 'text-gray-700'
                  }`}>
                  {etiqueta === 'propio' ? 'Estilo Propio' : 
                   etiqueta === 'comprado' ? 'Comprado' : 'Rentado'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ETIQUETAS */}
        <View className="p-4 bg-white mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-semibold text-gray-900">Etiquetas</Text>
            <TouchableOpacity
              onPress={() => setModalTag((prev) => ({ ...prev, visible: true }))}
              className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full"
            >
              <Ionicons name="add" size={14} color="#111827" />
              <Text className="text-gray-900 text-xs font-medium ml-1">Agregar</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <View key={index} className="bg-gray-100 rounded-full px-3 py-1.5 flex-row items-center">
                <Text className="text-gray-700 text-xs">#{tag}</Text>
                <TouchableOpacity onPress={() => handleRemoveTag(tag)} className="ml-2">
                  <Ionicons name="close" size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ))}
            {formData.tags.length === 0 && (
              <Text className="text-gray-400 text-xs italic">Sin etiquetas</Text>
            )}
          </View>
        </View>

        {/* COLECCIONES */}
        <View className="p-4 bg-white mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-semibold text-gray-900">Colecciones</Text>
            <Text className="text-xs text-gray-500">
              {formData.collections.length} seleccionadas
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {COLECCIONES_PREDEFINIDAS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => handleToggleCollection(item)}
                className={`px-4 py-2 rounded-full ${formData.collections.includes(item)
                  ? 'bg-blue-500'
                  : 'bg-gray-100 border border-gray-200'
                  }`}
              >
                <Text className={`text-xs font-medium ${formData.collections.includes(item) ? 'text-white' : 'text-gray-700'
                  }`}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ENLACES DE COMPRA */}
        <View className="p-4 bg-white mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-semibold text-gray-900">Enlaces de compra</Text>
            <TouchableOpacity
              onPress={() => setModalLink((prev) => ({ ...prev, visible: true }))}
              className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full"
            >
              <Ionicons name="add" size={14} color="#111827" />
              <Text className="text-gray-900 text-xs font-medium ml-1">Agregar</Text>
            </TouchableOpacity>
          </View>
          {formData.shoppingLinks.length > 0 ? (
            formData.shoppingLinks.map((link, index) => (
              <View key={index} className="bg-gray-50 p-3 rounded-lg mb-2 flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-gray-900 text-sm font-medium">{link.nombre}</Text>
                  <Text className="text-gray-500 text-xs" numberOfLines={1}>{link.url}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveLink(index)}>
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text className="text-gray-400 text-xs italic">Sin enlaces de compra</Text>
          )}
        </View>

        {/* BOTÓN DE PUBLICAR */}
        <View className="p-4">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loadingSubmit || imageCount === 0}
            className={`py-4 rounded-lg items-center shadow-sm ${loadingSubmit || imageCount === 0 ? 'bg-gray-300' : 'bg-blue-500'
              }`}
          >
            {loadingSubmit ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-white text-lg font-semibold">
                  {imageCount === 0 ? 'Selecciona imágenes' : `Publicar Look (${imageCount} ${imageCount === 1 ? 'imagen' : 'imágenes'})`}
                </Text>
                {imageCount > 0 && (
                  <Text className="text-white/80 text-xs mt-1">
                    Toca para publicar tu contenido
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODALS (TAGS y LINKS) */}
      <Modal
        animationType="fade"
        transparent
        visible={modalTag.visible}
        onRequestClose={() => setModalTag((prev) => ({ ...prev, visible: false }))}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-xl p-5 w-11/12 max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Nueva etiqueta</Text>
            <TextInput
              placeholder="Ej: vintage, verano, casual..."
              value={modalTag.value}
              onChangeText={(text) => setModalTag((prev) => ({ ...prev, value: text }))}
              className="p-3 border border-gray-200 rounded-lg text-gray-900 text-sm mb-4"
              autoFocus
              placeholderTextColor="#9CA3AF"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalTag({ visible: false, value: '' })}
                className="flex-1 py-2 border border-gray-300 rounded-lg"
              >
                <Text className="text-gray-700 text-center text-sm font-medium">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddTag}
                disabled={!modalTag.value.trim()}
                className={`flex-1 py-2 rounded-lg ${!modalTag.value.trim() ? 'bg-gray-300' : 'bg-blue-500'}`}
              >
                <Text className="text-white text-center text-sm font-medium">Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={modalLink.visible}
        onRequestClose={() => setModalLink({ visible: false, nombre: '', url: '' })}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-xl p-5 w-11/12 max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Enlace de compra</Text>
            <TextInput
              placeholder="Nombre del producto o tienda"
              value={modalLink.nombre}
              onChangeText={(text) => setModalLink((prev) => ({ ...prev, nombre: text }))}
              className="p-3 border border-gray-200 rounded-lg text-gray-900 text-sm mb-3"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              placeholder="URL del producto"
              value={modalLink.url}
              onChangeText={(text) => setModalLink((prev) => ({ ...prev, url: text }))}
              className="p-3 border border-gray-200 rounded-lg text-gray-900 text-sm mb-4"
              keyboardType="url"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalLink({ visible: false, nombre: '', url: '' })}
                className="flex-1 py-2 border border-gray-300 rounded-lg"
              >
                <Text className="text-gray-700 text-center text-sm font-medium">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddLink}
                disabled={!modalLink.nombre.trim() || !modalLink.url.trim()}
                className={`flex-1 py-2 rounded-lg ${!modalLink.nombre.trim() || !modalLink.url.trim() ? 'bg-gray-300' : 'bg-blue-500'
                  }`}
              >
                <Text className="text-white text-center text-sm font-medium">Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}