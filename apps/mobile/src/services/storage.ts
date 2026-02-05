import AsyncStorage from '@react-native-async-storage/async-storage';

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const value = await AsyncStorage.getItem(key);
    return safeParse(value, fallback);
  },
  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
