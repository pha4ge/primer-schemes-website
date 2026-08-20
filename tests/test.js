import { expect, test } from '@playwright/test';
import { CATALOG_INDEX_URL } from '../src/lib/config.js';

const INDEX_URL = CATALOG_INDEX_URL;

const CACHE_KEYS = {
	flatSchemes: 'catalog-cache:v3:flat-schemes'
};

const JSON_HEADERS = {
	'access-control-allow-origin': '*',
	'content-type': 'application/json'
};
const TEXT_HEADERS = {
	'access-control-allow-origin': '*',
	'content-type': 'text/plain'
};

// An index leaf in the v1.0.0-alpha (primer_scheme_*) shape.
const leaf = ({
	name,
	ampliconSize,
	version,
	status,
	contributors,
	organisms,
	license = 'CC-BY-SA-4.0'
}) => ({
	primer_scheme_name: name,
	amplicon_size: ampliconSize,
	primer_scheme_version: version,
	primer_scheme_development_status: status,
	primer_scheme_contributor: contributors.map((c) => ({ primer_scheme_contributor_name: c })),
	primer_scheme_target_organism: organisms.map((o) => ({
		primer_scheme_target_organism_name: o
	})),
	primer_scheme_license: license,
	primer_file_url: `https://example.test/${name}/${ampliconSize}/${version}/primer.bed`,
	reference_file_url: `https://example.test/${name}/${ampliconSize}/${version}/reference.fasta`,
	info_file_url: `https://example.test/${name}/${ampliconSize}/${version}/info.json`
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

const BASE_INDEX = indexOf(
	leaf({
		name: 'virus-a',
		ampliconSize: 400,
		version: 'v1.0.0',
		status: 'VALIDATED',
		contributors: ['Alice'],
		organisms: ['virus-a']
	})
);

// The flattened (internal) shape the cache stores.
const STALE_FLAT_SCHEMES = [
	{
		name: 'virus-a',
		amplicon_size: 400,
		version: 'v1.0.0',
		status: 'validated',
		contributors: ['Alice'],
		target_organisms: ['virus-a'],
		license: 'CC-BY-SA-4.0',
		aliases: [],
		primer_file_url: 'https://example.test/virus-a/400/v1.0.0/primer.bed',
		reference_file_url: 'https://example.test/virus-a/400/v1.0.0/reference.fasta',
		info_file_url: 'https://example.test/virus-a/400/v1.0.0/info.json'
	}
];

const INFO_JSON = {
	schema_version: '1.0.0-alpha',
	primer_scheme_name: 'virus-a',
	amplicon_size: 400,
	primer_scheme_version: 'v1.0.0',
	primer_scheme_development_status: 'VALIDATED',
	primer_scheme_contributor: [{ primer_scheme_contributor_name: 'Alice' }],
	primer_scheme_target_organism: [{ primer_scheme_target_organism_name: 'virus-a' }]
};

const BED_TEXT = [
	'# mock bedfile',
	'chr1\t0\t22\tAMP_1_LEFT\t1\t+',
	'chr1\t78\t100\tAMP_1_RIGHT\t1\t-'
].join('\n');
const REFERENCE_FASTA = ['>chr1', 'ACGTACGTACGTACGT'].join('\n');

const clone = (value) => JSON.parse(JSON.stringify(value));

async function mockCatalogRoutes(target, { indexData = BASE_INDEX, failIndex = false } = {}) {
	let indexRequests = 0;

	await target.route(INDEX_URL, (route) => {
		indexRequests += 1;
		if (failIndex) return route.abort('failed');
		return route.fulfill({
			status: 200,
			headers: JSON_HEADERS,
			body: JSON.stringify(clone(indexData))
		});
	});

	return {
		getIndexRequests: () => indexRequests
	};
}

const FACET_INDEX = indexOf(
	leaf({
		name: 'scheme-alpha',
		ampliconSize: 700,
		version: 'v1.0.0',
		status: 'VALIDATED',
		contributors: ['Alice'],
		organisms: ['species-a']
	}),
	leaf({
		name: 'scheme-beta',
		ampliconSize: 400,
		version: 'v1.0.0',
		status: 'VALIDATED',
		contributors: ['Bob'],
		organisms: ['species-b']
	}),
	leaf({
		name: 'scheme-gamma',
		ampliconSize: 700,
		version: 'v1.0.0',
		status: 'VALIDATED',
		contributors: ['Carol'],
		organisms: ['species-c']
	})
);

const facetOptions = async (page, facetTitle) => {
	const facet = page
		.locator('aside.sidebar .facet')
		.filter({ has: page.locator('legend h6', { hasText: facetTitle }) })
		.first();
	return (await facet.locator('label.checkbox-row span').allTextContents()).map((text) =>
		text.trim()
	);
};

async function mockSchemeAssets(page) {
	await page.route('https://example.test/**', (route) => {
		const url = route.request().url();
		if (url.endsWith('/info.json')) {
			return route.fulfill({
				status: 200,
				headers: JSON_HEADERS,
				body: JSON.stringify(clone(INFO_JSON))
			});
		}
		if (url.endsWith('/primer.bed')) {
			return route.fulfill({ status: 200, headers: TEXT_HEADERS, body: BED_TEXT });
		}
		if (url.endsWith('/reference.fasta')) {
			return route.fulfill({ status: 200, headers: TEXT_HEADERS, body: REFERENCE_FASTA });
		}
		return route.fulfill({ status: 404, headers: TEXT_HEADERS, body: 'not found' });
	});
}

const seedStaleCache = (page, flatSchemes = STALE_FLAT_SCHEMES) =>
	page.addInitScript(
		({ flatSchemesKey, data, fetchedAt }) => {
			window.localStorage.setItem(flatSchemesKey, JSON.stringify({ data, fetchedAt }));
		},
		{ flatSchemesKey: CACHE_KEYS.flatSchemes, data: flatSchemes, fetchedAt: 0 }
	);

const STALE_WARNING =
	'Using cached catalog data; upstream refresh failed. Data may be up to 2+ minutes old.';

test('home then detail in same tab reuses in-memory index cache', async ({ page }) => {
	const counters = await mockCatalogRoutes(page);
	await mockSchemeAssets(page);

	await page.goto('/');
	await expect(page.getByText('virus-a / 400 / v1.0.0')).toBeVisible();

	await page.goto('/detail/virus-a/400/v1.0.0/');
	await expect(page.getByRole('heading', { name: 'virus-a / 400 / v1.0.0' })).toBeVisible();

	expect(counters.getIndexRequests()).toBe(1);
});

test('new page load within ttl uses localStorage cache without refetch', async ({ context }) => {
	const counters = await mockCatalogRoutes(context);

	const firstPage = await context.newPage();
	await firstPage.goto('/');
	await expect(firstPage.getByText('virus-a / 400 / v1.0.0')).toBeVisible();
	await firstPage.close();

	const secondPage = await context.newPage();
	await secondPage.goto('/');
	await expect(secondPage.getByText('virus-a / 400 / v1.0.0')).toBeVisible();

	expect(counters.getIndexRequests()).toBe(1);
});

test('expired cache fallback renders home results and stale warning when upstream fails', async ({
	page
}) => {
	await seedStaleCache(page);
	await mockCatalogRoutes(page, { failIndex: true });
	await page.goto('/');

	await expect(page.getByText('virus-a / 400 / v1.0.0')).toBeVisible();
	await expect(page.getByText(STALE_WARNING)).toBeVisible();
	await expect(page.getByText('Unable to load schemes data...')).not.toBeVisible();
});

test('no cache and upstream failure keeps home error state', async ({ page }) => {
	await mockCatalogRoutes(page, { failIndex: true });
	await page.goto('/');
	await expect(page.getByText('Unable to load schemes data...')).toBeVisible();
});

test('detail page shows stale warning when stale index cache is used', async ({ page }) => {
	await seedStaleCache(page);
	await mockCatalogRoutes(page, { failIndex: true });
	await mockSchemeAssets(page);
	await page.goto('/detail/virus-a/400/v1.0.0/');

	await expect(page.getByRole('heading', { name: 'virus-a / 400 / v1.0.0' })).toBeVisible();
	await expect(page.getByText(STALE_WARNING)).toBeVisible();
});

test('a cache entry from the previous schema version is not reused', async ({ page }) => {
	// Old-shape payload under the superseded namespace must be ignored, not rendered.
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'catalog-cache:v2:flat-schemes',
			JSON.stringify({
				data: [{ name: 'ghost-scheme', amplicon_size: 999, version: 'v9.9.9' }],
				fetchedAt: Date.now()
			})
		);
	});
	await mockCatalogRoutes(page);
	await page.goto('/');

	await expect(page.getByText('virus-a / 400 / v1.0.0')).toBeVisible();
	await expect(page.getByText('ghost-scheme')).not.toBeVisible();
});

test('the tags facet is gone from the sidebar', async ({ page }) => {
	await mockCatalogRoutes(page);
	await page.goto('/');
	await expect(page.getByText('virus-a / 400 / v1.0.0')).toBeVisible();

	const facetTitles = await page.locator('aside.sidebar .facet legend h6').allTextContents();
	expect(facetTitles.map((t) => t.trim())).toEqual([
		'Status',
		'Amplicon Size',
		'License',
		'Organisms',
		'Contributors'
	]);
});

test('amplicon filter updates visible organism and contributor facets', async ({ page }) => {
	await mockCatalogRoutes(page, { indexData: FACET_INDEX });
	await page.goto('/?ampliconsize=700');
	await expect(page.getByText('scheme-alpha / 700 / v1.0.0')).toBeVisible();

	const organisms = await facetOptions(page, 'Organisms');
	const contributors = await facetOptions(page, 'Contributors');

	expect(organisms).toContain('species-a (1)');
	expect(organisms).toContain('species-c (1)');
	expect(organisms).not.toContain('species-b (1)');
	expect(contributors).toContain('Alice (1)');
	expect(contributors).toContain('Carol (1)');
	expect(contributors).not.toContain('Bob (1)');
});

test('contributor filter updates visible organism and amplicon facets', async ({ page }) => {
	await mockCatalogRoutes(page, { indexData: FACET_INDEX });
	await page.goto('/?contributor=Alice');
	await expect(page.getByText('scheme-alpha / 700 / v1.0.0')).toBeVisible();

	const organisms = await facetOptions(page, 'Organisms');
	const amplicons = await facetOptions(page, 'Amplicon Size');

	expect(organisms).toEqual(['species-a (1)']);
	expect(amplicons).toEqual(['700 (1)']);
});

test('organism filter updates visible contributor and amplicon facets', async ({ page }) => {
	await mockCatalogRoutes(page, { indexData: FACET_INDEX });
	await page.goto('/?organism=species-a');
	await expect(page.getByText('scheme-alpha / 700 / v1.0.0')).toBeVisible();

	const contributors = await facetOptions(page, 'Contributors');
	const amplicons = await facetOptions(page, 'Amplicon Size');

	expect(contributors).toEqual(['Alice (1)']);
	expect(amplicons).toEqual(['700 (1)']);
});

test('selected unmatched organism remains visible for deselection path', async ({ page }) => {
	await mockCatalogRoutes(page, { indexData: FACET_INDEX });
	await page.goto('/?contributor=Bob&organism=species-c');
	await expect(page.getByText('No results')).toBeVisible();

	const organisms = await facetOptions(page, 'Organisms');

	expect(organisms).toContain('species-c (0)');
	expect(organisms).toContain('species-b (1)');
});
