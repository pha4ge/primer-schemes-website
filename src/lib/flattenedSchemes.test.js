import { describe, expect, it } from 'vitest';
import { compareSchemes, flattenedSchemeIndex, resolveSchemeUrl } from './flattenedSchemes.js';
import { SCHEMES_RAW_BASE } from './config.js';

const leaf = (overrides = {}) => ({
	primer_scheme_name: 'virus-a',
	amplicon_size: 400,
	primer_scheme_version: 'v1.0.0',
	primer_scheme_development_status: 'DRAFT',
	primer_scheme_contributor: [{ primer_scheme_contributor_name: 'Alice' }],
	primer_scheme_target_organism: [{ primer_scheme_target_organism_name: 'virus-a' }],
	primer_scheme_license: 'CC-BY-SA-4.0',
	primer_scheme_checksums: {
		primer_scheme_sha256: 'abc',
		reference_sequence_sha256: 'def'
	},
	primer_file_url: 'virus-a/400/v1.0.0/primer.bed',
	reference_file_url: 'virus-a/400/v1.0.0/reference.fasta',
	info_file_url: 'virus-a/400/v1.0.0/info.json',
	...overrides
});

const indexOf = (...leaves) => {
	const primerschemes = {};
	for (const l of leaves) {
		const name = l.primer_scheme_name;
		const size = String(l.amplicon_size);
		primerschemes[name] ??= {};
		primerschemes[name][size] ??= {};
		primerschemes[name][size][l.primer_scheme_version] = l;
	}
	return { primerschemes };
};

describe('resolveSchemeUrl', () => {
	it('passes absolute URLs through unchanged', () => {
		const url = 'https://raw.githubusercontent.com/o/r/main/schemes/a/400/v1.0.0/primer.bed';
		expect(resolveSchemeUrl(url, 'https://example.com/schemes')).toBe(url);
	});

	it('resolves relative paths against the schemes base', () => {
		expect(resolveSchemeUrl('a/400/v1.0.0/primer.bed', 'https://example.com/schemes')).toBe(
			'https://example.com/schemes/a/400/v1.0.0/primer.bed'
		);
	});

	it('does not double up slashes', () => {
		expect(resolveSchemeUrl('/a/primer.bed', 'https://example.com/schemes/')).toBe(
			'https://example.com/schemes/a/primer.bed'
		);
	});

	it('returns undefined for a missing url', () => {
		expect(resolveSchemeUrl(undefined)).toBeUndefined();
		expect(resolveSchemeUrl('')).toBeUndefined();
	});
});

describe('flattenedSchemeIndex', () => {
	it('flattens nested scheme index into one array item per scheme version', () => {
		const schemeIndex = indexOf(
			leaf(),
			leaf({ primer_scheme_version: 'v2.0.0' }),
			leaf({
				primer_scheme_name: 'virus-b',
				amplicon_size: 500,
				primer_scheme_development_status: 'DEPRECATED'
			})
		);

		const flattened = flattenedSchemeIndex(schemeIndex);

		expect(flattened).toHaveLength(3);
		expect(flattened.map((scheme) => scheme.name)).toEqual(['virus-a', 'virus-a', 'virus-b']);
		expect(flattened.map((scheme) => scheme.version)).toEqual(['v2.0.0', 'v1.0.0', 'v1.0.0']);
		expect(flattened.map((scheme) => scheme.amplicon_size)).toEqual([400, 400, 500]);
	});

	it('maps primer_scheme_* names onto the internal field names', () => {
		const [scheme] = flattenedSchemeIndex(
			indexOf(
				leaf({
					primer_scheme_contributor: [
						{ primer_scheme_contributor_name: 'Alice' },
						{ primer_scheme_contributor_name: 'Bob' }
					],
					primer_scheme_target_organism: [{ primer_scheme_target_organism_name: 'sars-cov-2' }],
					primer_scheme_derived_from: 'virus-a/400/v0.9.0'
				})
			)
		);

		expect(scheme.contributors).toEqual(['Alice', 'Bob']);
		expect(scheme.target_organisms).toEqual(['sars-cov-2']);
		expect(scheme.license).toBe('CC-BY-SA-4.0');
		expect(scheme.derived_from).toBe('virus-a/400/v0.9.0');
		expect(scheme.checksums).toEqual({
			primer_scheme_sha256: 'abc',
			reference_sequence_sha256: 'def'
		});
	});

	it('normalizes status to lowercase', () => {
		const [scheme] = flattenedSchemeIndex(
			indexOf(leaf({ primer_scheme_development_status: 'VALIDATED' }))
		);
		expect(scheme.status).toBe('validated');
	});

	it('resolves relative file urls against the configured schemes base', () => {
		const [scheme] = flattenedSchemeIndex(indexOf(leaf()));

		expect(scheme.primer_file_url).toBe(`${SCHEMES_RAW_BASE}/virus-a/400/v1.0.0/primer.bed`);
		expect(scheme.reference_file_url).toBe(
			`${SCHEMES_RAW_BASE}/virus-a/400/v1.0.0/reference.fasta`
		);
		expect(scheme.info_file_url).toBe(`${SCHEMES_RAW_BASE}/virus-a/400/v1.0.0/info.json`);
	});

	it('keeps absolute file urls as published by a --base-url build', () => {
		const [scheme] = flattenedSchemeIndex(
			indexOf(leaf({ primer_file_url: 'https://example.com/schemes/a/400/v1/primer.bed' }))
		);
		expect(scheme.primer_file_url).toBe('https://example.com/schemes/a/400/v1/primer.bed');
	});

	it('tolerates omitted optional fields', () => {
		const bare = {
			primer_scheme_name: 'virus-a',
			amplicon_size: 400,
			primer_scheme_version: 'v1.0.0',
			primer_scheme_development_status: 'DRAFT'
		};
		const [scheme] = flattenedSchemeIndex(indexOf(bare));

		expect(scheme.contributors).toEqual([]);
		expect(scheme.target_organisms).toEqual([]);
		expect(scheme.derived_from).toBeUndefined();
		expect(scheme.primer_file_url).toBeUndefined();
	});

	it('initializes aliases to a distinct empty array per flattened entry', () => {
		const flattened = flattenedSchemeIndex(
			indexOf(leaf(), leaf({ primer_scheme_name: 'virus-b', amplicon_size: 500 }))
		);

		expect(flattened[0].aliases).toEqual([]);
		expect(flattened[1].aliases).toEqual([]);
		expect(flattened[0].aliases).not.toBe(flattened[1].aliases);
	});

	it('does not mutate the index it is given, and is repeatable', () => {
		const schemeIndex = indexOf(leaf());
		const first = flattenedSchemeIndex(schemeIndex);
		const second = flattenedSchemeIndex(schemeIndex);

		expect(schemeIndex.primerschemes['virus-a']['400']['v1.0.0']).toHaveProperty(
			'primer_scheme_contributor'
		);
		expect(second).toEqual(first);
	});

	it('sorts scheme names alphabetically regardless of index key order', () => {
		const flattened = flattenedSchemeIndex(
			indexOf(
				leaf({ primer_scheme_name: 'virus-c' }),
				leaf({ primer_scheme_name: 'virus-a' }),
				leaf({ primer_scheme_name: 'virus-b' })
			)
		);

		expect(flattened.map((scheme) => scheme.name)).toEqual(['virus-a', 'virus-b', 'virus-c']);
	});

	it('sorts amplicon sizes numerically, not lexically', () => {
		const flattened = flattenedSchemeIndex(
			indexOf(
				leaf({ amplicon_size: 2000 }),
				leaf({ amplicon_size: 400 }),
				leaf({ amplicon_size: 1200 })
			)
		);

		expect(flattened.map((scheme) => scheme.amplicon_size)).toEqual([400, 1200, 2000]);
	});

	it('sorts versions within one scheme and size newest first', () => {
		const flattened = flattenedSchemeIndex(
			indexOf(
				leaf({ primer_scheme_version: 'v5.3.2' }),
				leaf({ primer_scheme_version: 'v1.0.0' }),
				leaf({ primer_scheme_version: 'v5.10.0' }),
				leaf({ primer_scheme_version: 'v5.4.2' })
			)
		);

		expect(flattened.map((scheme) => scheme.version)).toEqual([
			'v5.10.0',
			'v5.4.2',
			'v5.3.2',
			'v1.0.0'
		]);
	});

	it('tolerates non-numeric pre-release versions without throwing', () => {
		const flattened = flattenedSchemeIndex(
			indexOf(
				leaf({ primer_scheme_version: 'v1.0.0-alpha' }),
				leaf({ primer_scheme_version: 'v1.0.0' })
			)
		);

		expect(flattened).toHaveLength(2);
		expect(flattened.map((scheme) => scheme.version)).toEqual(['v1.0.0-alpha', 'v1.0.0']);
	});

	it('orders by name, then size, then version together', () => {
		const flattened = flattenedSchemeIndex(
			indexOf(
				leaf({ primer_scheme_name: 'virus-b', amplicon_size: 2000 }),
				leaf({ primer_scheme_name: 'virus-a', amplicon_size: 1200 }),
				leaf({
					primer_scheme_name: 'virus-a',
					amplicon_size: 400,
					primer_scheme_version: 'v5.3.2'
				}),
				leaf({ primer_scheme_name: 'virus-a', amplicon_size: 400, primer_scheme_version: 'v5.4.2' })
			)
		);

		expect(
			flattened.map((scheme) => `${scheme.name}/${scheme.amplicon_size}/${scheme.version}`)
		).toEqual([
			'virus-a/400/v5.4.2',
			'virus-a/400/v5.3.2',
			'virus-a/1200/v1.0.0',
			'virus-b/2000/v1.0.0'
		]);
	});

	it('returns an empty array when no schemes are present', () => {
		expect(flattenedSchemeIndex({ primerschemes: {} })).toEqual([]);
		expect(flattenedSchemeIndex({})).toEqual([]);
	});
});

describe('compareSchemes', () => {
	const rec = (name, amplicon_size, version) => ({ name, amplicon_size, version });

	it('puts an earlier name first', () => {
		expect(
			compareSchemes(rec('virus-a', 400, 'v1.0.0'), rec('virus-b', 400, 'v1.0.0'))
		).toBeLessThan(0);
	});

	it('puts a smaller amplicon size first within one name', () => {
		expect(
			compareSchemes(rec('virus-a', 400, 'v1.0.0'), rec('virus-a', 1200, 'v1.0.0'))
		).toBeLessThan(0);
	});

	it('puts a newer version first within one name and size', () => {
		expect(
			compareSchemes(rec('virus-a', 400, 'v5.10.0'), rec('virus-a', 400, 'v5.4.2'))
		).toBeLessThan(0);
	});

	it('treats a missing version component as zero', () => {
		expect(compareSchemes(rec('virus-a', 400, 'v1.0'), rec('virus-a', 400, 'v1.0.0'))).toBe(0);
	});

	it('is symmetric for equal records', () => {
		expect(compareSchemes(rec('virus-a', 400, 'v1.0.0'), rec('virus-a', 400, 'v1.0.0'))).toBe(0);
	});
});
