import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "#f6f2e7" }
      }}
    >
      {/* Pantalla sin header */}
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />

      {/* Pantalla con header normal */}
      <Stack.Screen 
        name="home" 
        options={{ headerShown: true }} 
      />
    </Stack>
  );
}
