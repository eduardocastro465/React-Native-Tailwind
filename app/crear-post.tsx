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

// --- DEPENDENCIAS DE EXPO (Como en tu código anterior) ---
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
const API_URL = environment.api + '/posts';
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

  // 2. LÓGICA DE PERMISOS (Igual al código que funcionaba)
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

  // 4. FUNCIÓN: SELECCIONAR DE GALERÍA
  const pickImage = async () => {
    // Soporte Web específico (Input file)
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({
          ...prev,
          imagenesUris: [...prev.imagenesUris, ...files.map((file: any) => URL.createObjectURL(file))]
        }));
      };
      input.click();
      return;
    }

    // Soporte Móvil (Expo Image Picker)
    if (hasPermission === false) {
      Alert.alert('Permiso denegado', 'Necesitas conceder permisos de galería.');
      return;
    }

    setLoadingGallery(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        // allowsMultipleSelection: true, // Descomentar si usas la versión nueva de Expo que lo soporta
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData(prev => ({
          ...prev,
          imagenesUris: [...prev.imagenesUris, result.assets[0].uri]
        }));
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    } finally {
      setLoadingGallery(false);
    }
  };

  // 5. FUNCIÓN: GUARDAR EN GALERÍA (Auxiliar)
  const saveToGallery = async (uri: string) => {
    try {
      if (Platform.OS !== 'web') {
        const asset = await MediaLibrary.createAssetAsync(uri);
        // Opcional: Avisar al usuario
        // Alert.alert('Éxito', 'Foto guardada en tu galería'); 
        return asset;
      }
    } catch (error) {
      console.error('Error guardando en galería:', error);
    }
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
      formData.imagenesUris.forEach((uri, index) => {
        fd.append("imagenes", {
          uri: uri,
          name: `img_${Date.now()}_${index}.jpg`,
          type: "image/jpeg",
        } as any);
      });
      const res = await fetch(API_URL, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        Alert.alert("Error", json.error || "Error al publicar");
      } else {
        Alert.alert("Éxito", "Look publicado correctamente");
        router.back();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Error de conexión");
    } finally {
      setLoadingSubmit(false);
    }
  };
  const renderImages = () => (
    <View className="flex-row flex-wrap">
      {formData.imagenesUris.map((uri, index) => (
        <View key={index} className="relative mb-3 mr-3">
          <Image
            source={{ uri }}
            className="w-24 h-24 rounded-lg"
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => handleRemoveImage(index)}
            className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 items-center justify-center"
          >
            <Ionicons name="close-circle" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ))}
      {formData.imagenesUris.length === 0 && (
        <Text className="text-gray-400 text-sm italic text-center py-4 w-full">
          No hay imágenes seleccionadas
        </Text>
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

        {/* SECCIÓN DE IMÁGENES */}
        <View className="p-4 bg-white mb-3">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-semibold text-gray-900">Imágenes</Text>
            <Text className="text-xs text-gray-500">{imageCount}/{MAX_IMAGENES}</Text>
          </View>

          {renderImages()}

          {/* BOTONES DE CÁMARA Y GALERÍA */}
          {imageCount < MAX_IMAGENES && (
            <View className="flex-row gap-3 mt-3">

              {/* Botón Galería */}
              <TouchableOpacity
                onPress={pickImage}
                className="flex-1 flex-row items-center justify-center bg-gray-900 py-3 rounded-lg"
                disabled={loadingGallery}
              >
                {loadingGallery ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="images" size={16} color="#FFFFFF" />
                    <Text className="text-white text-sm font-medium ml-2">
                      Galería
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
                      <Ionicons name="camera" size={16} color="#111827" />
                      <Text className="text-gray-900 text-sm font-medium ml-2">Cámara</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* RESTO DEL FORMULARIO (DESCRIPCIÓN, TAGS, LINKS...) */}

        <View className="p-4 bg-white mb-3">
          <Text className="text-base font-semibold text-gray-900 mb-2">Descripción</Text>
          <TextInput
            placeholder="Describe tu estilo..."
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

        <View className="p-4 bg-white mb-3">
          <Text className="text-base font-semibold text-gray-900 mb-2">Tipo de look</Text>
          <View className="flex-row gap-2">
            {ETIQUETAS.map((etiqueta) => (
              <TouchableOpacity
                key={etiqueta}
                onPress={() => setFormData((prev) => ({ ...prev, etiqueta: etiqueta as any }))}
                className={`flex-1 py-2 rounded-lg items-center ${formData.etiqueta === etiqueta ? 'bg-gray-900' : 'bg-gray-100'
                  }`}
              >
                <Text className={`text-sm font-medium ${formData.etiqueta === etiqueta ? 'text-white' : 'text-gray-700'
                  }`}>
                  {etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

        <View className="p-4 bg-white mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-semibold text-gray-900">Colecciones</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {COLECCIONES_PREDEFINIDAS.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => handleToggleCollection(item)}
                  className={`px-4 py-2 rounded-full ${formData.collections.includes(item)
                    ? 'bg-gray-900'
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
        </View>

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

        <View className="p-4">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loadingSubmit || imageCount === 0}
            className={`py-4 rounded-lg items-center ${loadingSubmit || imageCount === 0 ? 'bg-gray-300' : 'bg-gray-900'
              }`}
          >
            {loadingSubmit ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-lg font-semibold">Publicar Look</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODALS (TAGS y LINKS) - SIN CAMBIOS */}
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
              placeholder="Ej: vintage, verano..."
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
                className={`flex-1 py-2 rounded-lg ${!modalTag.value.trim() ? 'bg-gray-300' : 'bg-gray-900'}`}
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
              placeholder="Producto"
              value={modalLink.nombre}
              onChangeText={(text) => setModalLink((prev) => ({ ...prev, nombre: text }))}
              className="p-3 border border-gray-200 rounded-lg text-gray-900 text-sm mb-3"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              placeholder="URL"
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
                className={`flex-1 py-2 rounded-lg ${!modalLink.nombre.trim() || !modalLink.url.trim() ? 'bg-gray-300' : 'bg-gray-900'
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