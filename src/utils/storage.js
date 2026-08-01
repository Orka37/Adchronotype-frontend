import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStore = {};

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage;
}

export async function getStoredItem(key) {
  if (canUseWebStorage()) {
    return window.localStorage.getItem(key);
  }
  if (Platform.OS === 'web') {
    return memoryStore[key] ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setStoredItem(key, value) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }
  if (Platform.OS === 'web') {
    memoryStore[key] = value;
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteStoredItem(key) {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(key);
    return;
  }
  if (Platform.OS === 'web') {
    delete memoryStore[key];
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
