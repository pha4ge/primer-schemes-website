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
	return flatSchemes;
};
