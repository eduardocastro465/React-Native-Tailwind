import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

// --- INTERFACES ---
interface PostFormData {
  imagenesUris: string[];
  descripcion: string;
  etiqueta: 'comprado' | 'rentado' | 'propio';
  tags: string[];
  collections: string[];
  shoppingLinks: { nombre: string; url: string }[];
}

// --- CONFIG ---
const USUARIA_ID = '67daf8baf4ed8050c7b7269a';

const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:4000/api/v1/posts'
  : 'http://192.168.0.107:4000/api/v1/posts ';

const ETIQUETAS = ['propio', 'comprado', 'rentado'];
const COLECCIONES_PREDEFINIDAS = ['Verano', 'Invierno', 'Ocasiones', 'Trabajo', 'Casual'];
const MAX_IMAGENES = 10;

// PERMISOS
const requestPermission = async (type: 'camera' | 'gallery'): Promise<boolean> => {
  if (Platform.OS === 'web' || Platform.OS === 'ios') return true;
  if (Platform.OS === 'android') {
    try {
      const permissionType =
        type === 'camera'
          ? PermissionsAndroid.PERMISSIONS.CAMERA
          : Platform.Version >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const result = await PermissionsAndroid.request(permissionType);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  return true;
};

// FUNCION SENCILLA - SIN React.FC
export default function CrearPostScreen() {
  const router = useRouter();

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

    if (Platform.OS === 'android') {
      const hasPermission = await requestPermission(type);
      if (!hasPermission) {
        Alert.alert('Permiso denegado', `No tienes permiso para acceder a ${type === 'camera' ? 'la cámara' : 'la galería'}.`);
        return;
      }
    }

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
    if (result.errorCode) return Alert.alert('Error', result.errorMessage || 'Error al cargar imagen.');

    if (result.assets?.length > 0) {
      const uris = result.assets.map(a => a.uri).filter(Boolean) as string[];
      setFormData(prev => ({
        ...prev,
        imagenesUris: [...prev.imagenesUris, ...uris.slice(0, MAX_IMAGENES - prev.imagenesUris.length)]
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
        shoppingLinks: [...prev.shoppingLinks, { nombre: modalLink.nombre.trim(), url: modalLink.url.trim() }],
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

  // SUBMIT - Versión UNIVERSAL
  const handleSubmit = async () => {
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

      // ID HARDCODEADO
      fd.append("usuariaId", USUARIA_ID);
      fd.append("descripcion", formData.descripcion);
      fd.append("etiqueta", formData.etiqueta);
      fd.append("tags", JSON.stringify(formData.tags));
      fd.append("collections", JSON.stringify(formData.collections));
      fd.append("shoppingLinks", JSON.stringify(formData.shoppingLinks));

      // Imágenes según plataforma
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
          });
        });
      }

      console.log("=== Enviando FormData ===");
      console.log("URL:", API_URL);
      console.log("usuariaId:", USUARIA_ID);

      const res = await fetch(API_URL, {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      console.log("✅ Respuesta:", json);

      if (!res.ok) {
        Alert.alert("Error del servidor", json.error || "Error al publicar");
      } else {
        Alert.alert("Éxito", "Look publicado correctamente");
        router.back();
      }
    } catch (err) {
      console.error("💥 Error:", err);
      Alert.alert("Error", `No se pudo publicar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Renderizado de imágenes con flexWrap (SIN FlatList)
  const renderImages = () => {
    const images = Platform.OS === 'web' 
      ? selectedFiles.map(f => ({ uri: URL.createObjectURL(f) }))
      : formData.imagenesUris.map(uri => ({ uri }));

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

  return (
    <View className="flex-1 bg-gray-50">
      {/* HEADER CON SOMBRA */}
      <View className="flex-row items-center justify-between mt-14 p-4 bg-white shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ArrowLeftIcon size={20} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Publicar look</Text>
        <View className="w-10" /> {/* Espacio para alinear el título al centro */}
      </View>

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
                    : `Galería (${MAX_IMAGENES - imageCount})`
                  }
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

        {/* RESTO DEL FORMULARIO */}
        <View className="p-4 bg-white mb-3">
          <Text className="text-base font-semibold text-gray-900 mb-2">Descripción</Text>
          <TextInput
            placeholder="Describe tu estilo..."
            value={formData.descripcion}
            onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion: text.substring(0, 300) }))}
            multiline
            maxLength={300}
            className="h-28 p-3 border border-gray-200 rounded-lg text-gray-900 text-sm"
            style={{ textAlignVertical: 'top' as any }}
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
                onPress={() => setFormData(prev => ({ ...prev, etiqueta }))}
                className={`flex-1 py-2 rounded-lg items-center ${
                  formData.etiqueta === etiqueta ? 'bg-gray-900' : 'bg-gray-100'
                }`}
              >
                <Text className={`text-sm font-medium ${
                  formData.etiqueta === etiqueta ? 'text-white' : 'text-gray-700'
                }`}>
                  {etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Etiquetas */}
        <View className="p-4 bg-white mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-semibold text-gray-900">Etiquetas</Text>
            <TouchableOpacity
              onPress={() => setModalTag(prev => ({ ...prev, visible: true }))}
              className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full"
            >
              <PlusIcon size={14} color="#111827" />
              <Text className="text-gray-900 text-xs font-medium ml-1">Agregar</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <View key={index} className="bg-gray-100 rounded-full px-3 py-1.5 flex-row items-center">
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

        {/* Colecciones */}
        <View className="p-4 bg-white mb-3">
          <Text className="text-base font-semibold text-gray-900 mb-2">Colecciones</Text>
          {/* ScrollView horizontal en lugar de FlatList */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
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
                <Text className={`text-xs font-medium ${
                  formData.collections.includes(item) ? 'text-white' : 'text-gray-700'
                }`}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Enlaces */}
        <View className="p-4 bg-white mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-semibold text-gray-900">Enlaces</Text>
            <TouchableOpacity
              onPress={() => setModalLink(prev => ({ ...prev, visible: true }))}
              className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full"
            >
              <PlusIcon size={14} color="#111827" />
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
                  <XMarkIcon size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text className="text-gray-400 text-xs italic">Sin enlaces de compra</Text>
          )}
        </View>

        {/* BOTÓN PUBLICAR AL FINAL - SIN ICONOS */}
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
              <Text className="text-white text-lg font-semibold">
                Publicar Look
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODALES */}
      <Modal animationType="fade" transparent visible={modalTag.visible} onRequestClose={() => setModalTag(prev => ({ ...prev, visible: false }))}>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-xl p-5 w-11/12 max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Nueva etiqueta</Text>
            <TextInput
              placeholder="Ej: vintage, verano..."
              value={modalTag.value}
              onChangeText={(text) => setModalTag(prev => ({ ...prev, value: text }))}
              className="p-3 border border-gray-200 rounded-lg text-gray-900 text-sm mb-4"
              autoFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setModalTag(prev => ({ ...prev, visible: false, value: '' }))} className="flex-1 py-2 border border-gray-300 rounded-lg">
                <Text className="text-gray-700 text-center text-sm font-medium">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddTag} disabled={!modalTag.value.trim()} className={`flex-1 py-2 rounded-lg ${!modalTag.value.trim() ? 'bg-gray-300' : 'bg-gray-900'}`}>
                <Text className="text-white text-center text-sm font-medium">Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={modalLink.visible} onRequestClose={() => setModalLink(prev => ({ ...prev, visible: false, nombre: '', url: '' }))}>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-xl p-5 w-11/12 max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Enlace de compra</Text>
            <TextInput placeholder="Producto" value={modalLink.nombre} onChangeText={(text) => setModalLink(prev => ({ ...prev, nombre: text }))} className="p-3 border border-gray-200 rounded-lg text-gray-900 text-sm mb-3" />
            <TextInput placeholder="URL" value={modalLink.url} onChangeText={(text) => setModalLink(prev => ({ ...prev, url: text }))} className="p-3 border border-gray-200 rounded-lg text-gray-900 text-sm mb-4" keyboardType="url" autoCapitalize="none" />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setModalLink(prev => ({ ...prev, visible: false, nombre: '', url: '' }))} className="flex-1 py-2 border border-gray-300 rounded-lg">
                <Text className="text-gray-700 text-center text-sm font-medium">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddLink} disabled={!modalLink.nombre.trim() || !modalLink.url.trim()} className={`flex-1 py-2 rounded-lg ${!modalLink.nombre.trim() || !modalLink.url.trim() ? 'bg-gray-300' : 'bg-gray-900'}`}>
                <Text className="text-white text-center text-sm font-medium">Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}