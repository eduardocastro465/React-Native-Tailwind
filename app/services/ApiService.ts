// src/services/ApiService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../environments/environment';
// CORREGIDO: Eliminé el espacio al final de la URL
const API_URL = environment.api;

console.log('URL3.11:', API_URL);

export const ApiService = {
  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const url = `${API_URL}${endpoint}`;
      const token = await AsyncStorage.getItem('authToken');

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        // El token del captcha se envía aquí, dentro del cuerpo de la solicitud (data).
        // `JSON.stringify` lo convierte en una cadena JSON que el servidor puede leer.
        body: JSON.stringify(data),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Respuesta no JSON del servidor:', textResponse);
        throw {
          status: response.status,
          error: { message: 'Respuesta inválida del servidor. Esperaba JSON.' },
        };
      }

      const responseData = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          error: responseData || { message: 'Ha ocurrido un error inesperado.' },
        };
      }

      return responseData;
    } catch (error: any) {
      if (error.status === 0 || error.message?.includes('Network request failed')) {
        throw { status: 0, error: { message: 'Error de conexión. Por favor, verifica tu conexión a internet.' } };
      }
      throw error;
    }
  },
};