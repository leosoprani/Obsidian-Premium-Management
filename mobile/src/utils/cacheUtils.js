import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@api_cache:';

export const cacheData = async (key, data) => {
    try {
        const cacheEntry = {
            data,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheEntry));
    } catch (e) {
        console.error('Cache save error:', e);
    }
};

export const getCachedData = async (key) => {
    try {
        const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (cached) {
            const { data } = JSON.parse(cached);
            return data;
        }
    } catch (e) {
        console.error('Cache read error:', e);
    }
    return null;
};

export const clearCache = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
    } catch (e) {
        console.error('Cache clear error:', e);
    }
};
