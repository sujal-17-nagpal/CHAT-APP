import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// operations
export const cacheGet = (key) => {
    return cache.get(key);
};

export const cacheSet = (key, value, ttl = 600) => {
    cache.set(key, value, ttl);
};

export const cacheDel = (key) => {
    cache.del(key);
};

export const cacheFlush = () => {
    cache.flushAll();
};

export const cacheDelPattern = (pattern) => {
    const keys = cache.keys();
    keys.forEach((key) => {
        if (key.includes(pattern)) {
            cache.del(key);
        }
    });
};

export default cache;
