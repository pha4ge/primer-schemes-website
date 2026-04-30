import { flattenedSchemeIndex } from './flattenedSchemes.js';
import { CATALOG_INDEX_URL } from './config.js';

const CACHE_NAMESPACE = 'catalog-cache:v2';
const CACHE_KEYS = {
	flatSchemes: `${CACHE_NAMESPACE}:flat-schemes`
};

const MEMORY_CACHE = {
	flatSchemes: null
};

const INFLIGHT = {
	flatSchemes: null
};

const nowMsDefault = () => Date.now();

const getDefaultStorage = () => {
	try {
		return globalThis?.localStorage ?? null;
	} catch {
		return null;
	}
};

const isValidCacheEntry = (entry) => {
	return (
		entry !== null &&
		typeof entry === 'object' &&
		Number.isFinite(entry.fetchedAt) &&
		Object.prototype.hasOwnProperty.call(entry, 'data')
	);
};

const isFresh = (entry, ttlMs, nowMs) => {
	if (!isValidCacheEntry(entry)) return false;
	return nowMs - entry.fetchedAt <= ttlMs;
};

const readStorageEntry = (storage, key) => {
	if (!storage) return null;
	let rawValue = null;
	try {
		rawValue = storage.getItem(key);
	} catch {
		return null;
	}
	if (!rawValue) return null;

	try {
		const parsed = JSON.parse(rawValue);
		if (!isValidCacheEntry(parsed)) {
			storage.removeItem(key);
			return null;
		}
		return parsed;
	} catch {
		try {
			storage.removeItem(key);
		} catch {
			// Ignore storage cleanup errors
		}
		return null;
	}
};

const writeStorageEntry = (storage, key, entry) => {
	if (!storage || !isValidCacheEntry(entry)) return;
	try {
		storage.setItem(key, JSON.stringify(entry));
	} catch {
		// Ignore storage write errors (quota/private mode)
	}
};

const toMeta = (source, isStale, fetchedAt) => ({
	source,
	isStale,
	fetchedAt
});

const getCachedResource = async ({
	resourceKey,
	storageKey,
	url,
	normalize,
	ttlMs = 120000,
	fetchImpl = globalThis.fetch,
	nowMs = nowMsDefault,
	storage = getDefaultStorage()
}) => {
	if (typeof fetchImpl !== 'function') {
		throw new Error('fetch implementation is not available');
	}

	const now = nowMs();
	const memoryEntry = MEMORY_CACHE[resourceKey];
	if (isFresh(memoryEntry, ttlMs, now)) {
		return {
			data: memoryEntry.data,
			meta: toMeta('memory', false, memoryEntry.fetchedAt)
		};
	}

	const storageEntry = readStorageEntry(storage, storageKey);
	if (isFresh(storageEntry, ttlMs, now)) {
		MEMORY_CACHE[resourceKey] = storageEntry;
		return {
			data: storageEntry.data,
			meta: toMeta('storage', false, storageEntry.fetchedAt)
		};
	}

	if (INFLIGHT[resourceKey]) {
		return INFLIGHT[resourceKey];
	}

	const staleFallbackEntry = storageEntry ?? memoryEntry;

	INFLIGHT[resourceKey] = (async () => {
		try {
			const response = await fetchImpl(url);
			if (!response?.ok) {
				throw new Error(`Failed to fetch resource: ${url}`);
			}
			const payload = await response.json();
			const normalizedData = normalize(payload);
			const freshEntry = {
				data: normalizedData,
				fetchedAt: nowMs()
			};
			MEMORY_CACHE[resourceKey] = freshEntry;
			writeStorageEntry(storage, storageKey, freshEntry);
			return {
				data: freshEntry.data,
				meta: toMeta('network', false, freshEntry.fetchedAt)
			};
		} catch (err) {
			if (isValidCacheEntry(staleFallbackEntry)) {
				MEMORY_CACHE[resourceKey] = staleFallbackEntry;
				return {
					data: staleFallbackEntry.data,
					meta: toMeta('stale-storage', true, staleFallbackEntry.fetchedAt)
				};
			}
			throw err;
		} finally {
			INFLIGHT[resourceKey] = null;
		}
	})();

	return INFLIGHT[resourceKey];
};

export const getCachedFlatSchemes = async (options = {}) => {
	return getCachedResource({
		resourceKey: 'flatSchemes',
		storageKey: CACHE_KEYS.flatSchemes,
		url: CATALOG_INDEX_URL,
		normalize: (indexPayload) => flattenedSchemeIndex(indexPayload),
		...options
	});
};

export const __resetCatalogCacheForTests = () => {
	MEMORY_CACHE.flatSchemes = null;
	INFLIGHT.flatSchemes = null;
};

export const CATALOG_CACHE_KEYS = { ...CACHE_KEYS };
