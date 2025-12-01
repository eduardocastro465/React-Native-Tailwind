import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "#f6f2e7" },
      }}
    >
      {/* Pantalla sin header */}
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />

      {/* Pantalla con header personalizado */}
      <Stack.Screen 
        name="home" 
        options={{ 
          headerShown: false,
          headerTitle: "Bienvenido a Atelier Look Social",
          headerTitleAlign: "center", // Centrar el texto
          headerStyle: {
            backgroundColor: "#f6f2e7", // Mismo color de fondo
            elevation: 0, // Quita sombra en Android
            shadowOpacity: 0, // Quita sombra en iOS
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "bold",
            color: "#111827",
          },
        }} 
      />
    </Stack>
  );
}
