import { SCHEMES_RAW_BASE } from './config.js';

const isAbsoluteUrl = (value) => /^https?:\/\//.test(value);

/**
 * The index emits *_file_url as absolute URLs when built with --base-url, and
 * as paths relative to the repository's schemes/ directory when built without.
 * Accept both.
 */
export const resolveSchemeUrl = (url, base = SCHEMES_RAW_BASE) => {
	if (typeof url !== 'string' || url === '') return undefined;
	if (isAbsoluteUrl(url)) return url;
	return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

/**
 * Adapt one index leaf (v1.0.0-alpha, primer_scheme_* field names) to the flat
 * record shape the rest of the app works with.
 */
const adaptScheme = (scheme, base) => ({
	name: scheme.primer_scheme_name,
	amplicon_size: scheme.amplicon_size,
	version: scheme.primer_scheme_version,
	// Statuses are upper case in the schema; pill classes and facet keys are lower.
	status: (scheme.primer_scheme_development_status ?? '').toLowerCase(),
	contributors: (scheme.primer_scheme_contributor ?? []).map(
		(c) => c.primer_scheme_contributor_name
	),
	target_organisms: (scheme.primer_scheme_target_organism ?? []).map(
		(o) => o.primer_scheme_target_organism_name
	),
	license: scheme.primer_scheme_license,
	checksums: scheme.primer_scheme_checksums,
	derived_from: scheme.primer_scheme_derived_from,
	primer_file_url: resolveSchemeUrl(scheme.primer_file_url, base),
	reference_file_url: resolveSchemeUrl(scheme.reference_file_url, base),
	info_file_url: resolveSchemeUrl(scheme.info_file_url, base),
	// The index carries no aliases; primer_scheme_identifier_alias lives in
	// info.json only. Kept because it is a search key.
	aliases: []
});

/**
 * Version strings in the index are vMAJOR.MINOR.PATCH. Parse the numeric parts so
 * v5.10.0 sorts above v5.4.2 (a plain string compare gets that backwards).
 */
const parseVersionParts = (version) =>
	String(version ?? '')
		.replace(/^v/i, '')
		.split('.')
		.map((part) => Number.parseInt(part, 10));

/** Newest version first. Falls back to a numeric-aware string compare for pre-releases. */
const compareVersionsDesc = (a, b) => {
	const partsA = parseVersionParts(a);
	const partsB = parseVersionParts(b);

	if (partsA.some(Number.isNaN) || partsB.some(Number.isNaN)) {
		return String(b ?? '').localeCompare(String(a ?? ''), undefined, { numeric: true });
	}

	const length = Math.max(partsA.length, partsB.length);
	for (let i = 0; i < length; i += 1) {
		const diff = (partsB[i] ?? 0) - (partsA[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
};

const toSortableSize = (size) => {
	const parsed = Number(size);
	return Number.isFinite(parsed) ? parsed : 0;
};

/** Name A->Z, then amplicon size ascending, then version newest first. */
export const compareSchemes = (a, b) => {
	const byName = String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
		numeric: true,
		sensitivity: 'base'
	});
	if (byName !== 0) return byName;

	const bySize = toSortableSize(a.amplicon_size) - toSortableSize(b.amplicon_size);
	if (bySize !== 0) return bySize;

	return compareVersionsDesc(a.version, b.version);
};

export const flattenedSchemeIndex = (schemeIndex, base = SCHEMES_RAW_BASE) => {
	const flatSchemes = [];

	for (const schemeName in schemeIndex?.primerschemes) {
		const schemeKeyedBySize = schemeIndex.primerschemes[schemeName];
		for (const size in schemeKeyedBySize) {
			const schemeKeyedByVersion = schemeKeyedBySize[size];
			for (const version in schemeKeyedByVersion) {
				flatSchemes.push(adaptScheme(schemeKeyedByVersion[version], base));
			}
		}
	}
	return flatSchemes.sort(compareSchemes);
};
