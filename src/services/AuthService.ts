// src/services/AuthService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from './ApiService';

export interface IToken {
  token: string;
}

export interface IUserData {
  rol: 'ADMIN' | 'CLIENTE' | 'TITULAR';
}

export interface ISignInRequest {
  email?: string;
  telefono?: string;
  password?: string;
  // El token del captcha se incluye en esta interfaz.
  captchaToken?: string;
}

export const AuthService = {
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error al guardar el token:', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error al obtener el token:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error al eliminar el token:', error);
    }
  },

  getUserData(token: string): IUserData | null {
    try {
      const userData = { rol: 'CLIENTE' }; // Simulación
      return userData as IUserData;
    } catch (error) {
      console.error('Error al decodificar el token:', error);
      return null;
    }
  },

  async signIn(request: ISignInRequest): Promise<IToken> {
    try {
      // Aquí, el objeto `request` que se pasa desde la pantalla de login ya contiene el token del captcha.
      // No necesitamos lógica adicional en este servicio.
      const response = await ApiService.post<IToken>('/autentificacion/signIn', request);
      if (response.token) {
        await this.saveToken(response.token);
      }
      return response;
    } catch (error: any) {
      throw error;
    }
  },

  async signInWithSocial(userData: any): Promise<IToken> {
    try {
      const response = await ApiService.post<IToken>('/autentificacion/signIn-Google-Facebook', userData);
      if (response.token) {
        await this.saveToken(response.token);
      }
      return response;
    } catch (error: any) {
      throw error;
    }
  },
};