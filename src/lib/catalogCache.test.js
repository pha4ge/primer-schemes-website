import { beforeEach, describe, expect, it } from 'vitest';
import {
	CATALOG_CACHE_KEYS,
	__resetCatalogCacheForTests,
	getCachedFlatSchemes
} from './catalogCache.js';

const INDEX_PAYLOAD = {
	primerschemes: {
		'virus-a': {
			400: {
				'v1.0.0': {
					primer_scheme_name: 'virus-a',
					amplicon_size: 400,
					primer_scheme_version: 'v1.0.0',
					primer_scheme_development_status: 'VALIDATED',
					primer_scheme_contributor: [{ primer_scheme_contributor_name: 'Alice' }],
					primer_scheme_target_organism: [{ primer_scheme_target_organism_name: 'virus-a' }],
					primer_scheme_license: 'CC-BY-SA-4.0',
					primer_file_url: 'https://example.com/primer.bed',
					reference_file_url: 'https://example.com/reference.fasta',
					info_file_url: 'https://example.com/info.json',
					primer_scheme_checksums: {
						primer_scheme_sha256: 'abc',
						reference_sequence_sha256: 'def'
					}
				}
			}
		}
	}
};

const INDEX_PAYLOAD_REFRESHED = {
	primerschemes: {
		'virus-b': {
			500: {
				'v2.0.0': {
					primer_scheme_name: 'virus-b',
					amplicon_size: 500,
					primer_scheme_version: 'v2.0.0',
					primer_scheme_development_status: 'DRAFT',
					primer_scheme_contributor: [{ primer_scheme_contributor_name: 'Bob' }],
					primer_scheme_target_organism: [{ primer_scheme_target_organism_name: 'virus-b' }],
					primer_scheme_license: 'CC-BY-SA-4.0',
					primer_file_url: 'https://example.com/primer.bed',
					reference_file_url: 'https://example.com/reference.fasta',
					info_file_url: 'https://example.com/info.json',
					primer_scheme_checksums: {
						primer_scheme_sha256: 'ghi',
						reference_sequence_sha256: 'jkl'
					}
				}
			}
		}
	}
};

const createStorage = () => {
	const data = new Map();
	return {
		getItem: (key) => (data.has(key) ? data.get(key) : null),
		setItem: (key, value) => {
			data.set(key, value);
		},
		removeItem: (key) => {
			data.delete(key);
		}
	};
};

const createJsonResponse = (payload) => ({
	ok: true,
	status: 200,
	json: async () => structuredClone(payload)
});

describe('catalogCache', () => {
	beforeEach(() => {
		__resetCatalogCacheForTests();
	});

	it('fresh network fetch populates memory/storage and returns network metadata', async () => {
		const storage = createStorage();
		let now = 1700000000000;
		let fetchCount = 0;

		const result = await getCachedFlatSchemes({
			storage,
			nowMs: () => now,
			fetchImpl: async () => {
				fetchCount += 1;
				return createJsonResponse(INDEX_PAYLOAD);
			}
		});

		expect(fetchCount).toBe(1);
		expect(result.meta.source).toBe('network');
		expect(result.meta.isStale).toBe(false);
		expect(result.data).toHaveLength(1);
		expect(JSON.parse(storage.getItem(CATALOG_CACHE_KEYS.flatSchemes))).toMatchObject({
			fetchedAt: now,
			data: expect.any(Array)
		});
	});

	it('subsequent call within ttl returns memory entry without network fetch', async () => {
		const storage = createStorage();
		let now = 1700000000000;
		let fetchCount = 0;

		await getCachedFlatSchemes({
			storage,
			nowMs: () => now,
			fetchImpl: async () => {
				fetchCount += 1;
				return createJsonResponse(INDEX_PAYLOAD);
			}
		});

		const second = await getCachedFlatSchemes({
			storage,
			nowMs: () => now + 500,
			fetchImpl: async () => {
				fetchCount += 1;
				throw new Error('should not fetch');
			}
		});

		expect(fetchCount).toBe(1);
		expect(second.meta.source).toBe('memory');
		expect(second.meta.isStale).toBe(false);
	});

	it('uses fresh localStorage entry when memory is empty', async () => {
		const storage = createStorage();
		const now = 1700000000000;
		storage.setItem(
			CATALOG_CACHE_KEYS.flatSchemes,
			JSON.stringify({
				fetchedAt: now - 1000,
				data: [{ name: 'stored' }]
			})
		);

		const result = await getCachedFlatSchemes({
			storage,
			nowMs: () => now,
			fetchImpl: async () => {
				throw new Error('should not fetch');
			}
		});

		expect(result.meta.source).toBe('storage');
		expect(result.meta.isStale).toBe(false);
		expect(result.data).toEqual([{ name: 'stored' }]);
	});

	it('expired cache triggers network refresh', async () => {
		const storage = createStorage();
		let now = 1700000000000;
		storage.setItem(
			CATALOG_CACHE_KEYS.flatSchemes,
			JSON.stringify({
				fetchedAt: now - 130000,
				data: [{ name: 'stale' }]
			})
		);

		let fetchCount = 0;
		const result = await getCachedFlatSchemes({
			storage,
			nowMs: () => now,
			fetchImpl: async () => {
				fetchCount += 1;
				return createJsonResponse(INDEX_PAYLOAD_REFRESHED);
			}
		});

		expect(fetchCount).toBe(1);
		expect(result.meta.source).toBe('network');
		expect(result.meta.isStale).toBe(false);
		expect(result.data[0].name).toBe('virus-b');
	});

	it('returns stale storage cache when refresh fails', async () => {
		const storage = createStorage();
		const now = 1700000000000;
		storage.setItem(
			CATALOG_CACHE_KEYS.flatSchemes,
			JSON.stringify({
				fetchedAt: now - 130000,
				data: [{ name: 'stale' }]
			})
		);

		const result = await getCachedFlatSchemes({
			storage,
			nowMs: () => now,
			fetchImpl: async () => {
				throw new Error('network down');
			}
		});

		expect(result.meta.source).toBe('stale-storage');
		expect(result.meta.isStale).toBe(true);
		expect(result.data).toEqual([{ name: 'stale' }]);
	});

	it('throws when refresh fails and no cache exists', async () => {
		const storage = createStorage();
		await expect(
			getCachedFlatSchemes({
				storage,
				nowMs: () => 1700000000000,
				fetchImpl: async () => {
					throw new Error('network down');
				}
			})
		).rejects.toThrow('network down');
	});

	it('ignores corrupted localStorage payload and refreshes from network', async () => {
		const storage = createStorage();
		storage.setItem(CATALOG_CACHE_KEYS.flatSchemes, '{not-json');

		const result = await getCachedFlatSchemes({
			storage,
			nowMs: () => 1700000000000,
			fetchImpl: async () => createJsonResponse(INDEX_PAYLOAD)
		});

		expect(result.meta.source).toBe('network');
		expect(() => JSON.parse(storage.getItem(CATALOG_CACHE_KEYS.flatSchemes))).not.toThrow();
	});
});
