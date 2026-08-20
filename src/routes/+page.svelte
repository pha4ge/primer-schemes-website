<script>
	import ResultsRow from './ResultsRow.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { getCachedFlatSchemes } from '$lib/catalogCache.js';
	import { base } from '$app/paths';

	import Fuse from 'fuse.js';

	import Pagination from './Pagination.svelte';

	// Initial state
	let flatSchemes = undefined;

	let schemesLoading = true;
	let schemesErrored = false;
	let staleCatalogNotice = false;
	let query = '';
	let fuse = undefined;

	const fuseOptions = {
		isCaseSensitive: false,
		keys: ['name', 'contributors', 'target_organisms', 'aliases'],
		ignoreLocation: true,
		threshold: 0.3
	};

	// Disable enter key, as refresh can wipe URL query state.
	const preventSearchInputSubmitOnEnter = (e) => {
		if (e.keyIdentifier == 'U+000A' || e.keyIdentifier == 'Enter' || e.keyCode == 13) {
			if (e.target.nodeName == 'INPUT' && e.target.type == 'text') {
				e.preventDefault();
				return false;
			}
		}
	};

	// Set the filter checkbox values
	let defaultShowStatus = {
		withdrawn: false,
		deprecated: false,
		draft: true,
		tested: true,
		validated: true
	};

	// Handle the URL
	$: uriSearchParams = $page.url.searchParams;

	onMount(() => {
		window.addEventListener('keydown', preventSearchInputSubmitOnEnter, true);
		return () => {
			window.removeEventListener('keydown', preventSearchInputSubmitOnEnter, true);
		};
	});

	// filter function
	const filterFunction = (
		scheme,
		statusObj,
		contributorFacetObj,
		organismFacetObj,
		ampliconSizeFacetObj,
		licenseFacetObj
	) => {
		// Filter by status
		if (!statusObj[scheme.status]) return false;

		// Filter by contributor (OR within facet)
		if (Object.values(contributorFacetObj).some(Boolean)) {
			if (!scheme.contributors.some((c) => contributorFacetObj[c])) return false;
		}

		// Filter by organism (OR within facet)
		if (Object.values(organismFacetObj).some(Boolean)) {
			if (!scheme.target_organisms.some((o) => organismFacetObj[o])) return false;
		}

		// Filter by amplicon size (OR within facet)
		if (Object.values(ampliconSizeFacetObj).some(Boolean)) {
			if (!ampliconSizeFacetObj[String(scheme.amplicon_size)]) return false;
		}

		// Filter by license (OR within facet)
		if (Object.values(licenseFacetObj).some(Boolean)) {
			if (!licenseFacetObj[scheme.license]) return false;
		}
		return true;
	};

	const toStringArray = (value) => {
		if (Array.isArray(value)) return value.map((item) => String(item));
		if (value != null) return [String(value)];
		return [];
	};

	const buildCountMap = (items, accessor) => {
		const counts = new Map();
		for (const entry of items ?? []) {
			for (const key of accessor(entry.item)) {
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}
		return counts;
	};

	const facetRowsForCurrentContext = (facetObj, countMap) => {
		return Object.entries(facetObj)
			.map(([key, selected]) => ({
				key,
				selected,
				count: countMap.get(key) ?? 0
			}))
			.filter((row) => row.selected || row.count > 0);
	};

	onMount(async function () {
		query = $page.url.searchParams.get('q') || '';
		pageNum = $page.url.searchParams.get('pageNum') || 1;

		// Load schemes
		try {
			const schemesResult = await getCachedFlatSchemes();
			flatSchemes = schemesResult.data;
			staleCatalogNotice = schemesResult.meta.isStale;
		} catch (err) {
			console.log(err);
			schemesErrored = true;
			flatSchemes = [];
		} finally {
			schemesLoading = false;
		}

		if (schemesErrored || flatSchemes === undefined) {
			return;
		}

		fuse = new Fuse(flatSchemes, fuseOptions);

		// Build additional facet options
		{
			let contributorOptions = [
				...new Set(flatSchemes.flatMap((scheme) => scheme.contributors))
			].sort();
			contributorOptions.forEach((c) => {
				if (contributors[c] === undefined) contributors[c] = false;
			});
		}
		{
			let organismOptions = [
				...new Set(flatSchemes.flatMap((scheme) => scheme.target_organisms))
			].sort();
			organismOptions.forEach((o) => {
				if (organisms[o] === undefined) organisms[o] = false;
			});
		}
		{
			let sizeOptions = [
				...new Set(flatSchemes.map((scheme) => String(scheme.amplicon_size)))
			].sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
			sizeOptions.forEach((size) => {
				if (ampliconSizes[size] === undefined) ampliconSizes[size] = false;
			});
		}
		{
			let licenseOptions = [
				...new Set(flatSchemes.map((scheme) => scheme.license).filter(Boolean))
			].sort();
			licenseOptions.forEach((l) => {
				if (licenses[l] === undefined) licenses[l] = false;
			});
		}

		// Parse the URL
		for (let [key, value] of $page.url.searchParams.entries()) {
			if (defaultShowStatus.hasOwnProperty(key)) {
				showStatus[key] = value === 'true';
			}
		}
		for (const c of $page.url.searchParams.getAll('contributor')) {
			if (contributors.hasOwnProperty(c)) contributors[c] = true;
		}
		for (const o of $page.url.searchParams.getAll('organism')) {
			if (organisms.hasOwnProperty(o)) organisms[o] = true;
		}
		for (const size of $page.url.searchParams.getAll('ampliconsize')) {
			if (ampliconSizes.hasOwnProperty(size)) ampliconSizes[size] = true;
		}
		for (const l of $page.url.searchParams.getAll('license')) {
			if (licenses.hasOwnProperty(l)) licenses[l] = true;
		}
	});

	$: flatSearchResult = query.trim().length
		? fuse?.search(query)
		: flatSchemes?.map((item, index) => ({
				item,
				refIndex: index,
				matches: [],
				score: 1
		  }));

	let contributors = {};
	let organisms = {};
	let ampliconSizes = {};
	let licenses = {};

	// Pages
	const pageSize = 100;
	$: pageIndex = pageNum - 1;
	$: pageCount = Math.ceil(filteredFlatSearchResult?.length / pageSize);
	$: pageNum = uriSearchParams.get('pageNum') || 1;

	// Filter the search results
	$: filteredFlatSearchResult = flatSearchResult?.filter((item) => {
		return filterFunction(item.item, showStatus, contributors, organisms, ampliconSizes, licenses);
	});

	// Sidebar facets should reflect the current search + all active filters except themselves.
	// Keep selected values visible so users can always deselect them.
	const allStatusesVisible = Object.fromEntries(Object.keys(defaultShowStatus).map((k) => [k, true]));
	$: statusFacetAvailabilityBase = flatSearchResult?.filter((item) =>
		filterFunction(item.item, allStatusesVisible, contributors, organisms, ampliconSizes, licenses)
	);
	$: contributorFacetAvailabilityBase = flatSearchResult?.filter((item) =>
		filterFunction(item.item, showStatus, {}, organisms, ampliconSizes, licenses)
	);
	$: organismFacetAvailabilityBase = flatSearchResult?.filter((item) =>
		filterFunction(item.item, showStatus, contributors, {}, ampliconSizes, licenses)
	);
	$: ampliconFacetAvailabilityBase = flatSearchResult?.filter((item) =>
		filterFunction(item.item, showStatus, contributors, organisms, {}, licenses)
	);
	$: licenseFacetAvailabilityBase = flatSearchResult?.filter((item) =>
		filterFunction(item.item, showStatus, contributors, organisms, ampliconSizes, {})
	);

	$: statusCounts = buildCountMap(statusFacetAvailabilityBase, (scheme) => [scheme.status]);
	$: visibleStatusRows = facetRowsForCurrentContext(showStatus, statusCounts);

	$: ampliconCounts = buildCountMap(ampliconFacetAvailabilityBase, (scheme) => [
		String(scheme.amplicon_size)
	]);
	$: visibleAmpliconSizeRows = facetRowsForCurrentContext(ampliconSizes, ampliconCounts);

	$: organismCounts = buildCountMap(organismFacetAvailabilityBase, (scheme) =>
		toStringArray(scheme.target_organisms)
	);
	$: visibleOrganismRows = facetRowsForCurrentContext(organisms, organismCounts);

	$: contributorCounts = buildCountMap(contributorFacetAvailabilityBase, (scheme) =>
		toStringArray(scheme.contributors)
	);
	$: visibleContributorRows = facetRowsForCurrentContext(contributors, contributorCounts);

	$: licenseCounts = buildCountMap(licenseFacetAvailabilityBase, (scheme) =>
		toStringArray(scheme.license)
	);
	$: visibleLicenseRows = facetRowsForCurrentContext(licenses, licenseCounts);

	$: searchResult = filteredFlatSearchResult?.slice(
		pageIndex * pageSize,
		pageIndex * pageSize + pageSize
	);

	let resultKey = 0;
	$: {
		filteredFlatSearchResult;
		resultKey += 1;
	}

	let timer;
	const debouncedSubmit = async () => {
		clearTimeout(timer);
		timer = setTimeout(updateURLQuery, 250);
	};

	$: if (pageNum > pageCount) {
		pageNum = Math.max(pageCount, 1);
	}

	// Only encode changes into the URL
	let showStatus = { ...defaultShowStatus };

	let updateURLStatus = async () => {
		let uriSearchParams = new URLSearchParams($page.url.searchParams.toString());
		for (let [key, value] of Object.entries(showStatus)) {
			if (defaultShowStatus[key] != value) {
				uriSearchParams.set(key, String(value));
			} else {
				uriSearchParams.delete(key);
			}
		}
		uriSearchParams.delete('pageNum');
		await goto(`${base}/?${uriSearchParams.toString()}`, {
			keepFocus: true
		});
	};

let updateURLFacet = async (paramName, facetObj) => {
		let uriSearchParams = new URLSearchParams($page.url.searchParams.toString());
		uriSearchParams.delete(paramName);
		Object.entries(facetObj)
			.filter(([, value]) => value)
			.map(([key]) => key)
			.sort()
			.forEach((value) => uriSearchParams.append(paramName, value));
		uriSearchParams.delete('pageNum');
		await goto(`${base}/?${uriSearchParams.toString()}`, {
			keepFocus: true
		});
	};

	let updateURLQuery = async () => {
		let uriSearchParams = new URLSearchParams($page.url.searchParams.toString());
		uriSearchParams.set('q', query.trim());
		uriSearchParams.delete('pageNum');
		await goto(`${base}/?${uriSearchParams.toString()}`, {
			keepFocus: true
		});
	};

	let clearSidebarFilters = async () => {
		showStatus = { ...defaultShowStatus };
		Object.keys(contributors).forEach((key) => (contributors[key] = false));
		Object.keys(organisms).forEach((key) => (organisms[key] = false));
		Object.keys(ampliconSizes).forEach((key) => (ampliconSizes[key] = false));
		Object.keys(licenses).forEach((key) => (licenses[key] = false));
		let uriSearchParams = new URLSearchParams($page.url.searchParams.toString());
		Object.keys(defaultShowStatus).forEach((key) => uriSearchParams.delete(key));
		uriSearchParams.delete('contributor');
		uriSearchParams.delete('organism');
		uriSearchParams.delete('ampliconsize');
		uriSearchParams.delete('license');
		uriSearchParams.delete('pageNum');
		await goto(`${base}/?${uriSearchParams.toString()}`, {
			keepFocus: true
		});
	};
</script>

{#if schemesLoading}
	<p aria-busy="true">Loading data...</p>
{:else if schemesErrored}
	<p>Unable to load schemes data...</p>
{:else}
	{#if staleCatalogNotice}
		<p class="cache-warning">
			Using cached catalog data; upstream refresh failed. Data may be up to 2+ minutes old.
		</p>
	{/if}
	<form id="search form" on:submit={updateURLQuery}>
		<div class="search-header">
			<h5>Search</h5>
		</div>
		<input type="text" placeholder="Search..." bind:value={query} on:keyup={debouncedSubmit} />
		<details>
			<summary>What is searchable?</summary>
			<ul>
				<li><strong>Scheme name</strong> — the identifier of the primer scheme (e.g. <code>artic-sars-cov-2</code>)</li>
				<li><strong>Contributors</strong> — names of individuals or groups who designed the scheme</li>
				<li><strong>Target organisms</strong> — the organism(s) the scheme is designed to sequence</li>
				<li><strong>Aliases</strong> — alternative names the scheme may be known by</li>
			</ul>
		</details>
	</form>

	<div class="search-layout">
		<aside class="sidebar">
			<div class="sidebar-header">
				<h5>Filter Results</h5>
				<button type="button" class="outline compact" on:click={clearSidebarFilters}
					>Clear all</button
				>
			</div>

			<div class="facet">
				<legend><h6>Status</h6></legend>
				<div class="facet-scroll">
					{#each visibleStatusRows as row}
						<label class="checkbox-row">
							<input
								type="checkbox"
								bind:checked={showStatus[row.key]}
								on:change={updateURLStatus}
							/>
							<span>{row.key} ({row.count})</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="facet">
				<legend><h6>Amplicon Size</h6></legend>
				<div class="facet-scroll">
					{#each visibleAmpliconSizeRows as row}
						<label class="checkbox-row">
							<input
								type="checkbox"
								bind:checked={ampliconSizes[row.key]}
								on:change={() => {
									ampliconSizes = { ...ampliconSizes };
									updateURLFacet('ampliconsize', ampliconSizes);
								}}
							/>
							<span>{row.key} ({row.count})</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="facet">
				<legend><h6>License</h6></legend>
				<div class="facet-scroll">
					{#each visibleLicenseRows as row}
						<label class="checkbox-row">
							<input
								type="checkbox"
								bind:checked={licenses[row.key]}
								on:change={() => {
									licenses = { ...licenses };
									updateURLFacet('license', licenses);
								}}
							/>
							<span>{row.key} ({row.count})</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="facet">
				<legend><h6>Organisms</h6></legend>
				<div class="facet-scroll">
					{#each visibleOrganismRows as row}
						<label class="checkbox-row">
							<input
								type="checkbox"
								bind:checked={organisms[row.key]}
								on:change={() => {
									organisms = { ...organisms };
									updateURLFacet('organism', organisms);
								}}
							/>
							<span>{row.key} ({row.count})</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="facet">
				<legend><h6>Contributors</h6></legend>
				<div class="facet-scroll">
					{#each visibleContributorRows as row}
						<label class="checkbox-row">
							<input
								type="checkbox"
								bind:checked={contributors[row.key]}
								on:change={() => {
									contributors = { ...contributors };
									updateURLFacet('contributor', contributors);
								}}
							/>
							<span>{row.key} ({row.count})</span>
						</label>
					{/each}
				</div>
			</div>
		</aside>

		<div>
			{#key resultKey}
				<div in:fade={{ duration: 150 }}>
					{#if (searchResult?.length ?? 0) > 0}
						<table>
							<tbody>
								{#each searchResult as result}
									<ResultsRow scheme={result.item} {query} />
								{/each}
							</tbody>
						</table>
					{:else}
						<p>No results</p>
					{/if}
					<Pagination
						{pageCount}
						{pageNum}
						resultCount={filteredFlatSearchResult?.length ?? 0}
						pageSize={searchResult.length}
					/>
				</div>
			{/key}
		</div>
	</div>
{/if}

<style>
	form {
		margin-bottom: 1.5rem;
		padding: 1.2rem 1.25rem;
		background: #ffffff;
		border: 1px solid rgba(95, 107, 119, 0.2);
		border-radius: 8px;
		box-shadow: 0 1px 5px rgba(31, 41, 51, 0.06);
	}

	.cache-warning {
		margin-bottom: 1rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid #d9b34b;
		border-radius: 4px;
		background: #fff8e1;
		color: #5f4a12;
	}

	input[type='text'] {
		border-radius: 4px;
	}

	.search-header {
		margin-bottom: 0.75rem;
	}

	.search-header h5 {
		margin: 0;
		line-height: 1.15;
	}

	form details {
		margin-top: 0.5rem;
		font-size: 0.9rem;
		color: var(--pico-muted-color);
	}

	form details summary {
		cursor: pointer;
		color: var(--pico-primary);
	}

	form details ul {
		margin: 0.5rem 0 0 0;
		padding-left: 1.25rem;
	}

	form details li {
		margin-bottom: 0.25rem;
	}

	.search-layout label:hover {
		color: var(--pico-secondary);
	}

	table {
		background: transparent;
		border-collapse: separate;
		border-spacing: 0 0.35rem;
	}

	.search-layout {
		display: grid;
		grid-template-columns: 280px minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

	.sidebar {
		position: sticky;
		top: 88px;
		background: #ffffff;
		border: 1px solid rgba(95, 107, 119, 0.2);
		border-radius: 8px;
		padding: 0.9rem;
		max-height: calc(100vh - 110px);
		overflow: auto;
	}

	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.7rem;
	}

	.sidebar-header h5 {
		margin: 0;
		line-height: 1.15;
	}

	.sidebar-header button {
		margin: 0;
		align-self: center;
		line-height: 1.15;
	}

	.sidebar legend {
		margin-bottom: 0;
	}

	.facet + .facet {
		margin-top: 1rem;
		padding-top: 0.85rem;
		border-top: 1px solid rgba(95, 107, 119, 0.18);
	}

	.facet h6 {
		margin-bottom: 0.45rem;
	}

	.facet-scroll {
		max-height: 170px;
		overflow: auto;
		padding-right: 0.25rem;
	}

	.checkbox-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 0.22rem;
	}

	button.compact {
		padding: 0.25rem 0.55rem;
		font-size: 0.8rem;
	}

	@media (max-width: 980px) {
		.search-layout {
			grid-template-columns: 1fr;
		}

		.sidebar {
			position: static;
			max-height: none;
		}
	}
</style>
