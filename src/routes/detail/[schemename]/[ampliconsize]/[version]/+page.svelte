<script>
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getCachedFlatSchemes } from '$lib/catalogCache.js';
	import StatusPill from '$lib/StatusPill.svelte';
	import { GITHUB_REPO_SCHEMES_BASE } from '$lib/config.js';
	import { base } from '$app/paths';

	import AmpliconPlot from './DefaultAmpliconPlot.svelte';

	/*
	// Initial state
	*/
	// Schemes
	let flatSchemes = undefined;
	let schemesErrored = false;
	let staleCatalogNotice = false;

	// Scheme
	let scheme = undefined;
	let schemeLoading = true;
	let schemeNotFound = false;

	// Reference
	let reference = undefined;
	let referenceLoading = false;
	let referenceErrored = false;
	let showReference = false;

	// Name copy
	let nameCopied = false;
	let nameCopyResetTimer = undefined;

	// Info.json
	let info = undefined;
	let infoLoading = true;
	let infoErrored = false;
	let showRawInfoJson = false;
	let infoCopied = false;
	let infoCopyResetTimer = undefined;

	// Bedfile
	let rawBedfile = undefined;
	let bedfile = undefined;
	let bedfileErrored = false;
	let bedfileLoading = true;
	let showBedfile = false;

	const infoSectionDefinitions = [
		{
			title: 'Core Metadata',
			keys: [
				'schema_version',
				'primer_scheme_name',
				'amplicon_size',
				'primer_scheme_version',
				'primer_scheme_identifier',
				'primer_scheme_development_status'
			]
		},
		{
			title: 'Attribution',
			keys: [
				'primer_scheme_contributor',
				'primer_scheme_target_organism',
				'primer_scheme_identifier_alias',
				'primer_scheme_license',
				'citation'
			]
		},
		{
			title: 'Classification',
			keys: [
				'primer_scheme_application',
				'primer_scheme_scope',
				'primer_scheme_derived_from',
				'primer_scheme_vendor',
				'primer_scheme_generator',
				'primer_scheme_details'
			]
		},
		{
			title: 'Files And Checksums',
			keys: [
				'primer_file_url',
				'reference_file_url',
				'info_file_url',
				'primer_scheme_checksums'
			]
		},
		{
			title: 'External Links',
			keys: ['links']
		}
	];
	const infoSectionKeys = new Set(infoSectionDefinitions.flatMap((section) => section.keys));

	const isProbablyUrl = (value) => typeof value === 'string' && /^https?:\/\//.test(value);
	const isPlainObject = (value) =>
		value !== null && typeof value === 'object' && !Array.isArray(value);
	// Contributors, vendors and generators all expose a *_name string.
	const namedObjectLabel = (value) =>
		value.primer_scheme_contributor_name ??
		value.primer_scheme_vendor_name ??
		value.primer_scheme_generator_name ??
		value.name;
	const isNamedObject = (value) =>
		isPlainObject(value) && typeof namedObjectLabel(value) === 'string';
	const organismLabel = (value) =>
		value.primer_scheme_target_organism_name ??
		value.primer_scheme_target_organism_ncbi_taxon_id ??
		value.common_name ??
		value.ncbi_tax_id;
	const isOrganismObject = (value) =>
		isPlainObject(value) && organismLabel(value) !== undefined;
	const isLinksMap = (value) =>
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.values(value).some((v) => Array.isArray(v) || typeof v === 'string');
	const normalizeLinkGroups = (value) =>
		Object.entries(value ?? {})
			.map(([group, raw]) => ({
				group,
				items: (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean)
			}))
			.filter((group) => group.items.length > 0);
	const isFieldValueEmpty = (value) => {
		if (value === null || value === undefined) return true;
		if (typeof value === 'string') return value.trim().length === 0;
		if (Array.isArray(value)) return value.length === 0;
		if (typeof value === 'object') return Object.keys(value).length === 0;
		return false;
	};
	const emptyFieldLabel = (key) => {
		const keyText = String(key).replaceAll('_', ' ');
		const label = keyText === 'contactinfo' ? 'contact info' : keyText;
		return `No ${label}`;
	};
	const displayValue = (value) => {
		if (value === null || value === undefined) return '';
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}
		return JSON.stringify(value);
	};

	// derived_from is a scheme identifier ("<name>/<amplicon_size>/<version>").
	// Link it only when that scheme is actually in the index.
	$: derivedFrom = scheme?.derived_from
		? (() => {
				const [name, size, version] = String(scheme.derived_from).split('/');
				const exists = flatSchemes?.some(
					(s) =>
						s.name === name &&
						s.amplicon_size === Number.parseInt(size) &&
						s.version === version
				);
				return {
					label: scheme.derived_from,
					href: exists ? `${base}/detail/${name}/${size}/${version}` : undefined
				};
		  })()
		: undefined;

	$: infoSections = info
		? infoSectionDefinitions
				.map((section) => ({
					...section,
					entries: section.keys
						.filter((key) => info[key] !== undefined)
						.map((key) => ({ key, value: info[key] }))
				}))
				.filter((section) => section.entries.length > 0)
		: [];

	$: infoAdditionalEntries = info
		? Object.keys(info)
				.filter((key) => !infoSectionKeys.has(key))
				.sort()
				.map((key) => ({ key, value: info[key] }))
		: [];

	async function copyName() {
		if (!scheme?.name) return;
		try {
			await navigator.clipboard.writeText(`${scheme.name}/${scheme.amplicon_size}/${scheme.version}`.replace(/\s/g, ''));
			nameCopied = true;
			clearTimeout(nameCopyResetTimer);
			nameCopyResetTimer = setTimeout(() => {
				nameCopied = false;
			}, 1400);
		} catch (err) {
			console.error(err);
		}
	}

	async function copyInfoJson() {
		if (!info) return;
		const infoText = JSON.stringify(info, null, 2);
		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(infoText);
			} else {
				const textArea = document.createElement('textarea');
				textArea.value = infoText;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
			}
			infoCopied = true;
			clearTimeout(infoCopyResetTimer);
			infoCopyResetTimer = setTimeout(() => {
				infoCopied = false;
			}, 1400);
		} catch (err) {
			console.error(err);
		}
	}

	function download(content, filename) {
		// Create a file
		let file = new File([content], filename, {
			type: 'text/plain'
		});
		const link = document.createElement('a');
		const url = URL.createObjectURL(file);

		link.href = url;
		link.download = file.name;
		document.body.appendChild(link);
		link.click();

		// Remove links
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	}

	onMount(async function () {
		// Load schemes
		try {
			const schemesResult = await getCachedFlatSchemes();
			flatSchemes = schemesResult.data;
			staleCatalogNotice = schemesResult.meta.isStale;
		} catch (err) {
			console.log(err);
			schemesErrored = true;
			schemeLoading = false;
			infoLoading = false;
			bedfileLoading = false;
			return;
		}

		// Find this scheme
		scheme = flatSchemes.find((s) => {
			return (
				s.name === $page.params.schemename &&
				s.amplicon_size === Number.parseInt($page.params.ampliconsize) &&
				s.version === $page.params.version
			);
		});

		if (scheme === undefined) {
			schemeNotFound = true;
			schemeLoading = false;
			infoLoading = false;
			bedfileLoading = false;
			return;
		} else {
			schemeLoading = false;
		}

		// Load info.json
		try {
			const response = await fetch(scheme.info_file_url);
			info = await response.json();
		} catch (err) {
			console.error(err);
			infoErrored = true;
		} finally {
			infoLoading = false;
		}

		// Load bedfile
		try {
			let response = await fetch(scheme.primer_file_url);
			rawBedfile = await response.text();

			bedfile = rawBedfile
				.trim()
				.split('\n')
				.map((bedline) => bedline.split('\t'));
		} catch (err) {
			console.error(err);
			bedfileErrored = true;
		} finally {
			bedfileLoading = false;
		}

		// Load reference
		referenceLoading = true;
		try {
			let response = await fetch(scheme.reference_file_url);
			reference = await response.text();
		} catch (err) {
			console.error(err);
			referenceErrored = true;
		} finally {
			referenceLoading = false;
		}
	});

	onDestroy(() => {
		clearTimeout(infoCopyResetTimer);
	});
</script>

{#if schemeLoading || infoLoading || bedfileLoading}
	<p aria-busy="true">Loading data...</p>
{:else if schemeNotFound}
	<dialog open>
		<article>
			<header>Not found</header>
			<p>Scheme was not found in the index.</p>
		</article>
	</dialog>
{:else if schemesErrored || infoErrored || bedfileErrored || referenceErrored}
	<dialog open>
		<article>
			<header>Error</header>
			<p>Unable to load scheme data.</p>
		</article>
	</dialog>
{:else}
	{#if staleCatalogNotice}
		<p class="cache-warning">Using cached catalog data; upstream refresh failed. Data may be up to 2+ minutes old.</p>
	{/if}
	<div class="grid level">
		<h2>
			{scheme.name} / {scheme.amplicon_size} / {scheme.version}
			<button type="button" class="copy-name" on:click={copyName} title="Copy scheme name">
				{#if nameCopied}
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
				{/if}
			</button>
		</h2>
		<StatusPill status={scheme.status} />
		<a
			href="{GITHUB_REPO_SCHEMES_BASE}/{scheme.name}/{scheme.amplicon_size}/{scheme.version}"
			class="contrast">[github-page]</a
		>
	</div>

	{#if derivedFrom}
		<p class="derived-from">
			Derived from
			{#if derivedFrom.href}
				<a href={derivedFrom.href}>{derivedFrom.label}</a>
			{:else}
				<span>{derivedFrom.label}</span>
			{/if}
		</p>
	{/if}

	{#if infoLoading}
		<p aria-busy="true">Loading data...</p>
	{:else}
		{#if info.description}
			<p>{info.description}</p>
		{/if}

		<article>
			<header class="grid level">
				<div><strong>Scheme Overview</strong></div>
			</header>
			<figure>
				<AmpliconPlot bedfileUrl={scheme.primer_file_url} />
			</figure>
		</article>
	{/if}

	<h2>Scheme Details</h2>

	<article>
		<header>
			<nav>
				<ul class="downloadbutton">
					<li><strong>info.json</strong></li>
				</ul>
				<ul class="downloadbutton">
					<li class="downloadbutton">
						<button
							type="button"
							class="download"
							on:click={() => {
								showRawInfoJson = !showRawInfoJson;
							}}
						>
							{showRawInfoJson ? 'structured view' : 'raw json'}
						</button>
					</li>
					<li class="downloadbutton">
						<button type="button" class="download" on:click={copyInfoJson}>
							{infoCopied ? 'copied' : 'copy'}
						</button>
					</li>
					<li class="downloadbutton">
						<button
							type="button"
							class="download"
							data-tooltip="Download info.json"
							on:click={() => {
								download(JSON.stringify(info, null, 2), 'info.json');
							}}
						>
							download
						</button>
					</li>
				</ul>
			</nav>
		</header>
		<div class="overflow-auto">
			{#if showRawInfoJson}
				<pre class="json-raw"><code>{JSON.stringify(info, null, 2)}</code></pre>
			{:else}
				{#each infoSections as section}
					<section class="json-section">
						<h6>{section.title}</h6>
						<table class="json-table">
							<tbody>
								{#each section.entries as entry}
									<tr>
										<th scope="row"><code>{entry.key}</code></th>
										<td>
											{#if isFieldValueEmpty(entry.value)}
												<span class="value-empty">{emptyFieldLabel(entry.key)}</span>
											{:else if entry.value instanceof Array}
												{#if entry.value.length === 0}
													<span class="value-empty">{emptyFieldLabel(entry.key)}</span>
												{:else}
													<div class="chip-wrap">
														{#each entry.value as valueItem}
															{#if isProbablyUrl(valueItem)}
																<a
																	class="value-chip link-chip"
																	href={valueItem}
																	target="_blank"
																	rel="noopener noreferrer">{valueItem}</a
																>
															{:else if isNamedObject(valueItem)}
																<span class="value-chip" data-tooltip={Object.entries(valueItem).map(([k, v]) => `${k}: ${v}`).join('\n')}>{namedObjectLabel(valueItem)}</span>
															{:else if isOrganismObject(valueItem)}
																<span class="value-chip" data-tooltip={Object.entries(valueItem).map(([k, v]) => `${k}: ${v}`).join('\n')}>{organismLabel(valueItem)}</span>
															{:else}
																<span class="value-chip">{displayValue(valueItem)}</span>
															{/if}
														{/each}
													</div>
												{/if}
											{:else if entry.key === 'links' && isLinksMap(entry.value)}
												<div class="link-groups">
													{#if normalizeLinkGroups(entry.value).length === 0}
														<span class="value-empty">No links</span>
													{:else}
														{#each normalizeLinkGroups(entry.value) as group}
															<div class="link-group">
																<strong>{group.group}</strong>
																<div class="chip-wrap">
																	{#each group.items as link}
																		{#if isProbablyUrl(link)}
																			<a
																				class="value-chip link-chip"
																				href={link}
																				target="_blank"
																				rel="noopener noreferrer">{link}</a
																			>
																		{:else}
																			<span class="value-chip">{displayValue(link)}</span>
																		{/if}
																	{/each}
																</div>
															</div>
														{/each}
													{/if}
												</div>
											{:else if entry.value !== null && typeof entry.value === 'object'}
												<details class="json-object">
													<summary>View object</summary>
													<pre><code>{JSON.stringify(entry.value, null, 2)}</code></pre>
												</details>
											{:else if isProbablyUrl(entry.value)}
												<a href={entry.value} target="_blank" rel="noopener noreferrer"
													>{entry.value}</a
												>
											{:else if entry.key === 'status'}
												<StatusPill status={entry.value} />
											{:else}
												<span>{displayValue(entry.value)}</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>
				{/each}

				{#if infoAdditionalEntries.length > 0}
					<section class="json-section">
						<h6>Additional Fields</h6>
						<table class="json-table">
							<tbody>
								{#each infoAdditionalEntries as entry}
									<tr>
										<th scope="row"><code>{entry.key}</code></th>
										<td>
											{#if isFieldValueEmpty(entry.value)}
												<span class="value-empty">{emptyFieldLabel(entry.key)}</span>
											{:else if entry.value instanceof Array}
												{#if entry.value.length === 0}
													<span class="value-empty">{emptyFieldLabel(entry.key)}</span>
												{:else}
													<div class="chip-wrap">
														{#each entry.value as valueItem}
															{#if isProbablyUrl(valueItem)}
																<a
																	class="value-chip link-chip"
																	href={valueItem}
																	target="_blank"
																	rel="noopener noreferrer">{valueItem}</a
																>
															{:else if isNamedObject(valueItem)}
																<span class="value-chip" data-tooltip={Object.entries(valueItem).map(([k, v]) => `${k}: ${v}`).join('\n')}>{namedObjectLabel(valueItem)}</span>
															{:else if isOrganismObject(valueItem)}
																<span class="value-chip" data-tooltip={Object.entries(valueItem).map(([k, v]) => `${k}: ${v}`).join('\n')}>{organismLabel(valueItem)}</span>
															{:else}
																<span class="value-chip">{displayValue(valueItem)}</span>
															{/if}
														{/each}
													</div>
												{/if}
											{:else if entry.key === 'links' && isLinksMap(entry.value)}
												<div class="link-groups">
													{#if normalizeLinkGroups(entry.value).length === 0}
														<span class="value-empty">No links</span>
													{:else}
														{#each normalizeLinkGroups(entry.value) as group}
															<div class="link-group">
																<strong>{group.group}</strong>
																<div class="chip-wrap">
																	{#each group.items as link}
																		{#if isProbablyUrl(link)}
																			<a
																				class="value-chip link-chip"
																				href={link}
																				target="_blank"
																				rel="noopener noreferrer">{link}</a
																			>
																		{:else}
																			<span class="value-chip">{displayValue(link)}</span>
																		{/if}
																	{/each}
																</div>
															</div>
														{/each}
													{/if}
												</div>
											{:else if entry.value !== null && typeof entry.value === 'object'}
												<details class="json-object">
													<summary>View object</summary>
													<pre><code>{JSON.stringify(entry.value, null, 2)}</code></pre>
												</details>
											{:else if isProbablyUrl(entry.value)}
												<a href={entry.value} target="_blank" rel="noopener noreferrer"
													>{entry.value}</a
												>
											{:else if entry.key === 'status'}
												<StatusPill status={entry.value} />
											{:else}
												<span>{displayValue(entry.value)}</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>
				{/if}
			{/if}
		</div>
	</article>

	<article>
		<header>
			<nav>
				<ul class="downloadbutton">
					<li><strong>primer.bed</strong></li>
					<li>
						<em data-tooltip="Show file">
							<input
								name="showBedfile"
								type="checkbox"
								role="switch"
								aria-invalid="false"
								bind:checked={showBedfile}
							/>
						</em>
					</li>
				</ul>
				<ul class="downloadbutton">
					<li class="downloadbutton">
						<button
							type="button"
							class="download"
							data-tooltip="Download primer.bed"
							on:click={() => {
								download(rawBedfile, 'primer.bed');
							}}
						>
							download
						</button>
					</li>
				</ul>
			</nav>
		</header>
		<div class="overflow-auto">
			{#if showBedfile}
				<figure>
					{#each bedfile as bedline}
						{#if bedline[0].startsWith('#')}
							<pre>{bedline}</pre>
						{/if}
					{/each}
					<table>
						<pre>
						<tbody>
						<!-- Write the bed file -->
						{#each bedfile as bedline}
									{#if !bedline[0].startsWith('#')}
										<tr>
									{#each bedline as column}
												<td>{column}</td>
											{/each}
								</tr>
									{/if}
								{/each}
						</tbody>
					</pre>
					</table>
				</figure>
			{:else}
				<p>Toggle to show</p>
			{/if}
		</div>
	</article>

	<article>
		<header>
			<nav>
				<ul class="downloadbutton">
					<li><strong>reference.fasta</strong></li>
					<li>
						<em data-tooltip="Show file">
							<input
								name="showBedfile"
								type="checkbox"
								role="switch"
								aria-invalid="false"
								bind:checked={showReference}
							/>
						</em>
					</li>
				</ul>
				<ul class="downloadbutton">
					<li class="downloadbutton">
						<button
							type="button"
							class="download"
							data-tooltip="Download reference.fasta"
							on:click={() => {
								download(reference, 'reference.fasta');
							}}
						>
							download
						</button>
					</li>
				</ul>
			</nav>
		</header>
		<div class="overflow-auto">
			{#if !showReference}
				<p>Toggle to show</p>
			{:else if referenceLoading}
				<p aria-busy="true">Loading reference...</p>
			{:else if referenceErrored}
				<p>ERROR</p>
			{:else}
				<pre>{reference}</pre>
			{/if}
		</div>
	</article>

{/if}

<style>
	.copy-name {
		display: inline-flex;
		align-items: center;
		margin: 0 0 0 0.4rem;
		padding: 0.2rem 0.3rem;
		background: none;
		border: none;
		color: var(--pico-muted-color);
		cursor: pointer;
		vertical-align: middle;
		border-radius: 4px;
		line-height: 1;
	}

	.copy-name:hover {
		color: var(--pico-primary);
		background: rgba(35, 74, 114, 0.08);
	}

	.level {
		grid-template-columns: 1fr auto;
		align-items: center;
		margin-bottom: 2em;
	}
	td,
	th {
		border: none;
		margin-bottom: 0em;
		line-height: 0.5em;
	}

	figure td {
		white-space: nowrap;
	}

	th {
		font-weight: bold;
	}
	article header {
		background-color: var(--pico-primary);
		color: rgb(255, 254, 247);
	}

	p[aria-busy='true'] {
		margin-bottom: 1em;
	}
	td {
		background-color: transparent;
	}
	button.download {
		color: var(--pico-contrast-inverse);
		background-color: rgb(0, 0, 0, 0);
		margin-bottom: 0em;
		--pico-border-color: var(--pico-contrast-inverse);
	}
	button.download:hover {
		box-shadow: 0px 0px 1px 1px var(--pico-contrast-inverse);
	}
	ul.downloadbutton {
		padding-top: 0;
		padding-bottom: 0;
		color: var(--pico-contrast-inverse);
	}
	li.downloadbutton {
		padding-top: 0;
		padding-bottom: 0;
	}

	.cache-warning {
		margin-bottom: 1rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid #d9b34b;
		border-radius: 4px;
		background: #fff8e1;
		color: #5f4a12;
	}

	.json-section + .json-section {
		margin-top: 1rem;
	}

	.json-section h6 {
		margin-bottom: 0.45rem;
	}

	.json-table th,
	.json-table td {
		border: none;
		border-bottom: 1px solid rgba(115, 130, 140, 0.22);
		line-height: 1.4;
		padding: 0.7rem 0.65rem;
		vertical-align: middle;
	}

	.json-table th {
		width: 32%;
		background: rgba(255, 255, 255, 0.45);
	}

	.json-table td {
		white-space: normal;
		background: rgba(255, 255, 255, 0.24);
	}

	.chip-wrap {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.value-chip {
		display: inline-block;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		border: 1px solid rgba(115, 130, 140, 0.28);
		background: rgba(255, 255, 255, 0.65);
		font-size: 0.9rem;
	}

	.link-chip {
		text-decoration: none;
	}

	.link-chip:hover {
		text-decoration: underline;
	}

	.link-groups {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.link-group strong {
		display: block;
		margin-bottom: 0.2rem;
		font-size: 0.9rem;
		text-transform: lowercase;
	}

	.value-empty {
		color: #607282;
		font-style: italic;
	}

	.json-object summary {
		cursor: pointer;
		font-weight: 600;
		color: var(--pico-primary);
	}

	.json-object pre,
	.json-raw {
		background: rgba(255, 255, 255, 0.72);
		border: 1px solid rgba(115, 130, 140, 0.2);
		border-radius: 8px;
		padding: 0.75rem;
		margin-top: 0.5rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	@media (max-width: 860px) {
		.json-table th,
		.json-table td {
			display: block;
			width: 100%;
		}

		.json-table th {
			padding-bottom: 0.2rem;
			border-bottom: none;
		}

		.json-table td {
			padding-top: 0.2rem;
		}
	}

	.derived-from {
		margin-top: -0.5rem;
		font-size: 0.875rem;
		opacity: 0.8;
	}
</style>
