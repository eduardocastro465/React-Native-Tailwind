import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const useLogout = () => {
  const router = useRouter();

  const logout = async () => {
    try {
      // 1️⃣ Cerrar sesión en Firebase
      await auth().signOut();

      // 2️⃣ Cerrar sesión de Google (si se usó Google Sign-In)
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        await GoogleSignin.signOut();
      }

      // 3️⃣ Limpiar AsyncStorage
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userData");

      // 4️⃣ Redirigir a pantalla de login
      router.push("/login");
      
    } catch (error) {
      console.log("Error al cerrar sesión:", error);
    }
  };

  return logout;
};

export default useLogout;
