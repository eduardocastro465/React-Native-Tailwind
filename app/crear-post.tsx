import { useRouter } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    PermissionsAndroid,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    ArrowLeftIcon,
    CameraIcon,
    PhotoIcon,
    PlusIcon,
    XMarkIcon,
} from 'react-native-heroicons/outline';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from './environments/environment';

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

// PERMISOS
const requestPermission = async (type: 'camera' | 'gallery'): Promise<boolean> => {
  if (Platform.OS === 'web' || Platform.OS === 'ios') return true;

  try {
    let permission;
    if (type === 'camera') {
      permission = PermissionsAndroid.PERMISSIONS.CAMERA;
    } else {
      permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    }

    const granted = await PermissionsAndroid.request(permission);

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        "Permiso requerido",
        `Necesitamos acceso a la ${type === 'camera' ? 'cámara' : 'galería'} para continuar.`
      );
      return false;
    }

    return true;

  } catch (err) {
    return false;
  }
};

// FUNCION SENCILLA - SIN React.FC
export default function CrearPostScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [formData, setFormData] = useState<PostFormData>({
    imagenesUris: [],
    descripcion: '',
    etiqueta: 'propio',
    tags: [],
    collections: [],
    shoppingLinks: [],
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalTag, setModalTag] = useState({ visible: false, value: '' });
  const [modalLink, setModalLink] = useState({ visible: false, nombre: '', url: '' });

  // CORRECCIÓN: Obtener datos del usuario al montar el componente de manera robusta
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('Cargando datos del usuario para crear post...');
        
        // Primero intentar desde userData
        const userData = await getUserData();
        console.log('UserData obtenido:', userData);
        
        if (userData && userData._id) {
          console.log('User ID cargado desde userData:', userData._id);
          setUserData(userData);
          setLoadingUser(false);
          return;
        }

        // Si no funciona, intentar desde el token
        console.log('Intentando obtener ID desde token...');
        const userIdFromToken = await getUserIdFromToken();
        console.log('User ID desde token:', userIdFromToken);
        
        if (userIdFromToken) {
          // Crear un objeto userData básico con el ID del token
          const basicUserData: UserData = {
            _id: userIdFromToken,
            nombre: 'Usuario',
            fotoDePerfil: 'https://res.cloudinary.com/dxmhlxdxo/image/upload/v1743916178/Imagenes%20para%20usar%20xD/gxvcu5gik59c0uu7zz4p.png',
            email: ''
          };
          setUserData(basicUserData);
          setLoadingUser(false);
          return;
        }

        // Si nada funciona, mostrar error
        console.log('No se pudo obtener el ID del usuario');
        Alert.alert('Error', 'No se pudo obtener la información del usuario');
        router.back();
        
      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        Alert.alert('Error', 'Error al cargar información del usuario');
        router.back();
      } finally {
        setLoadingUser(false);
      }
    };

    loadUserData();
  }, []);

  // Selector universal de imágenes
  const handleImagePicker = useCallback(async (type: 'gallery' | 'camera') => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const files = Array.from(e.target.files) as File[];
        setSelectedFiles(prev => [...prev, ...files].slice(0, MAX_IMAGENES));
      };
      input.click();
      return;
    }

    // --- PERMISOS ANDROID ---
    const hasPermission = await requestPermission(type);
    if (!hasPermission) return;

    const options = {
      mediaType: 'photo' as const,
      quality: 0.7,
      selectionLimit: type === 'gallery' ? (MAX_IMAGENES - formData.imagenesUris.length) : 1,
      includeBase64: false,
      saveToPhotos: false,
    };

    const result = type === 'gallery'
      ? await launchImageLibrary(options)
      : await launchCamera(options);

    if (result.didCancel) return;
    if (result.errorCode)
      return Alert.alert('Error', result.errorMessage || 'Error al cargar imagen.');

    if (result.assets?.length > 0) {
      const uris = result.assets.map((a) => a.uri).filter(Boolean) as string[];
      setFormData((prev) => ({
        ...prev,
        imagenesUris: [
          ...prev.imagenesUris,
          ...uris.slice(0, MAX_IMAGENES - prev.imagenesUris.length),
        ],
      }));
    }
  }, [formData.imagenesUris]);

  const handleRemoveImage = (index: number) => {
    if (Platform.OS === 'web') {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setFormData(prev => ({
        ...prev,
        imagenesUris: prev.imagenesUris.filter((_, i) => i !== index),
      }));
    }
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
    // Verificar que tenemos el ID del usuario
    if (!userData?._id) {
      Alert.alert("Error", "No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.");
      return;
    }

    const imagenesParaEnviar = Platform.OS === 'web'
      ? selectedFiles
      : formData.imagenesUris;

    if (!imagenesParaEnviar?.length) {
      Alert.alert("Error", "Debes seleccionar al menos una imagen.");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();

      fd.append("usuariaId", userData._id);
      fd.append("descripcion", formData.descripcion);
      fd.append("etiqueta", formData.etiqueta);
      fd.append("tags", JSON.stringify(formData.tags));
      fd.append("collections", JSON.stringify(formData.collections));
      fd.append("shoppingLinks", JSON.stringify(formData.shoppingLinks));

      if (Platform.OS === 'web') {
        selectedFiles.forEach(file => fd.append("imagenes", file));
      } else {
        formData.imagenesUris.forEach((uri, index) => {
          if (!uri) return;

          let finalUri = uri;
          if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
            finalUri = `file://${uri}`;
          }

          fd.append("imagenes", {
            uri: finalUri,
            name: `img_${Date.now()}_${index}.jpg`,
            type: "image/jpeg",
          } as any);
        });
      }

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
      setLoading(false);
    }
  };

  const renderImages = () => {
    const images = Platform.OS === 'web'
      ? selectedFiles.map((f) => ({ uri: URL.createObjectURL(f) }))
      : formData.imagenesUris.map((uri) => ({ uri }));

    return (
      <View className="flex-row flex-wrap">
        {images.map((item, index) => (
          <View key={index} className="relative mb-3 mr-3">
            <Image
              source={{ uri: item.uri }}
              className="w-24 h-24 rounded-lg"
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={() => handleRemoveImage(index)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 items-center justify-center"
            >
              <XMarkIcon size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
        {images.length === 0 && (
          <Text className="text-gray-400 text-sm italic text-center py-4 w-full">
            No hay imágenes seleccionadas
          </Text>
        )}
      </View>
    );
  };

  const imageCount = Platform.OS === 'web' ? selectedFiles.length : formData.imagenesUris.length;

  // Header con botón de regreso
  const renderHeader = () => (
    <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-200">
      <TouchableOpacity 
        onPress={() => router.back()} 
        className="mr-3"
      >
        <ArrowLeftIcon size={24} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900">Crear Nuevo Look</Text>
    </View>
  );

  // Mostrar loading mientras se cargan los datos del usuario
  if (loadingUser) {
    return (
      <View className="flex-1 bg-gray-50">
        {renderHeader()}
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-4 text-gray-600">Cargando información del usuario...</Text>
        </View>
      </View>
    );
  }

  // Si no hay usuario, no renderizar el formulario
  if (!userData) {
    return (
      <View className="flex-1 bg-gray-50">
        {renderHeader()}
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-gray-600 text-center mb-4">
            Error: No se pudo cargar la información del usuario
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="bg-gray-900 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {renderHeader()}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* IMÁGENES */}
        <View className="p-4 bg-white mb-3">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-semibold text-gray-900">Imágenes</Text>
            <Text className="text-xs text-gray-500">
              {imageCount}/{MAX_IMAGENES}
            </Text>
          </View>

          {renderImages()}

          {imageCount < MAX_IMAGENES && (
            <View className="flex-row gap-3 mt-3">
              <TouchableOpacity
                onPress={() => handleImagePicker('gallery')}
                className="flex-1 flex-row items-center justify-center bg-gray-900 py-3 rounded-lg"
              >
                <PhotoIcon size={16} color="#FFFFFF" />
                <Text className="text-white text-sm font-medium ml-2">
                  {Platform.OS === 'web'
                    ? 'Seleccionar archivos'
                    : `Galería (${MAX_IMAGENES - imageCount})`}
                </Text>
              </TouchableOpacity>

              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  onPress={() => handleImagePicker('camera')}
                  className="flex-1 flex-row items-center justify-center border border-gray-300 py-3 rounded-lg"
                >
                  <CameraIcon size={16} color="#111827" />
                  <Text className="text-gray-900 text-sm font-medium ml-2">Cámara</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* DESCRIPCIÓN */}
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

        {/* TIPO DE LOOK */}
        <View className="p-4 bg-white mb-3">
          <Text className="text-base font-semibold text-gray-900 mb-2">Tipo de look</Text>
          <View className="flex-row gap-2">
            {ETIQUETAS.map((etiqueta) => (
              <TouchableOpacity
                key={etiqueta}
                onPress={() => setFormData((prev) => ({ ...prev, etiqueta: etiqueta as any }))}
                className={`flex-1 py-2 rounded-lg items-center ${
                  formData.etiqueta === etiqueta ? 'bg-gray-900' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    formData.etiqueta === etiqueta ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)}
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
              <PlusIcon size={14} color="#111827" />
              <Text className="text-gray-900 text-xs font-medium ml-1">Agregar</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <View
                key={index}
                className="bg-gray-100 rounded-full px-3 py-1.5 flex-row items-center"
              >
                <Text className="text-gray-700 text-xs">#{tag}</Text>
                <TouchableOpacity onPress={() => handleRemoveTag(tag)} className="ml-2">
                  <XMarkIcon size={12} color="#6B7280" />
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
          <Text className="text-base font-semibold text-gray-900 mb-2">Colecciones</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="flex-row gap-2"
          >
            {COLECCIONES_PREDEFINIDAS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => handleToggleCollection(item)}
                className={`px-4 py-2 rounded-full ${
                  formData.collections.includes(item)
                    ? 'bg-gray-900'
                    : 'bg-gray-100 border border-gray-200'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    formData.collections.includes(item)
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
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
              <PlusIcon size={14} color="#111827" />
              <Text className="text-gray-900 text-xs font-medium ml-1">Agregar</Text>
            </TouchableOpacity>
          </View>

          {formData.shoppingLinks.length > 0 ? (
            formData.shoppingLinks.map((link, index) => (
              <View
                key={index}
                className="bg-gray-50 p-3 rounded-lg mb-2 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-gray-900 text-sm font-medium">{link.nombre}</Text>
                  <Text className="text-gray-500 text-xs" numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveLink(index)}>
                  <XMarkIcon size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text className="text-gray-400 text-xs italic">Sin enlaces de compra</Text>
          )}
        </View>

        {/* BOTÓN PUBLICAR */}
        <View className="p-4">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || imageCount === 0}
            className={`py-4 rounded-lg items-center ${
              loading || imageCount === 0 ? 'bg-gray-300' : 'bg-gray-900'
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-lg font-semibold">Publicar Look</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL ETIQUETA */}
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
                <Text className="text-gray-700 text-center text-sm font-medium">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddTag}
                disabled={!modalTag.value.trim()}
                className={`flex-1 py-2 rounded-lg ${
                  !modalTag.value.trim() ? 'bg-gray-300' : 'bg-gray-900'
                }`}
              >
                <Text className="text-white text-center text-sm font-medium">
                  Agregar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ENLACE */}
      <Modal
        animationType="fade"
        transparent
        visible={modalLink.visible}
        onRequestClose={() => setModalLink({ visible: false, nombre: '', url: '' })}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-xl p-5 w-11/12 max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Enlace de compra
            </Text>

            <TextInput
              placeholder="Producto"
              value={modalLink.nombre}
              onChangeText={(text) =>
                setModalLink((prev) => ({ ...prev, nombre: text }))
              }
              className="p-3 border border-gray-200 rounded-lg text-gray-900 text-sm mb-3"
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              placeholder="URL"
              value={modalLink.url}
              onChangeText={(text) =>
                setModalLink((prev) => ({ ...prev, url: text }))
              }
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
                <Text className="text-gray-700 text-center text-sm font-medium">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddLink}
                disabled={!modalLink.nombre.trim() || !modalLink.url.trim()}
                className={`flex-1 py-2 rounded-lg ${
                  !modalLink.nombre.trim() || !modalLink.url.trim()
                    ? 'bg-gray-300'
                    : 'bg-gray-900'
                }`}
              >
                <Text className="text-white text-center text-sm font-medium">
                  Agregar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}