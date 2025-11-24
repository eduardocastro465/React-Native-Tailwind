// src/services/ApiService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../environments/environment';
// Definir la URL base directamente aquí en lugar de usar variables de entorno
const API_BASE_URL = environment.api;

console.log('API Base URL:', API_BASE_URL);

export const ApiService = {
  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const token = await AsyncStorage.getItem('authToken');

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      console.log('Making POST request to:', url);
      console.log('Request data:', data);

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
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

  // Métodos adicionales que podrías necesitar
  async get<T>(endpoint: string): Promise<T> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const token = await AsyncStorage.getItem('authToken');

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
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

  async put<T>(endpoint: string, data: any): Promise<T> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const token = await AsyncStorage.getItem('authToken');

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      const response = await fetch(url, {
        method: 'PUT',
        headers: headers,
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

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const token = await AsyncStorage.getItem('authToken');

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      const response = await fetch(url, {
        method: 'DELETE',
        headers: headers,
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