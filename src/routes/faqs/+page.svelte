<script>
	import {
		GITHUB_REPO_URL,
		GITHUB_REPO_ISSUES_URL,
		GITHUB_REPO_SCHEMES_BASE,
		CATALOG_REPO_OWNER,
		CATALOG_REPO_NAME
	} from '$lib/config.js';

	// The scheme used throughout as a worked example.
	const exampleScheme = `${GITHUB_REPO_SCHEMES_BASE}/artic-sars-cov-2/400/v4.1.0`;
	const schemaUrl =
		'https://github.com/pha4ge/primaschema/blob/main/src/primaschema/schema/info.yml';
</script>

<section>
	<hgroup>
		<h1>FAQs</h1>
	</hgroup>

	<article>
		<header>
			<nav>
				<ul>
					<li><strong>What is a primer scheme definition?</strong></li>
				</ul>
			</nav>
		</header>
		<p>
			Every scheme lives in a <code>name/amplicon_size/version</code> directory and is defined by three
			files:
		</p>
		<ul>
			<li>
				<a href="{exampleScheme}/reference.fasta"><code>reference.fasta</code></a>: the reference
				sequence the primer coordinates are defined against.
			</li>
			<li>
				<a href="{exampleScheme}/primer.bed"><code>primer.bed</code></a>: a seven column
				<a href="https://primalscheme.com">Primal Scheme</a>-like BED file of primer sequences and
				coordinates.
			</li>
			<li>
				<a href="{exampleScheme}/info.json"><code>info.json</code></a>: scheme metadata, validated
				against a <a href={schemaUrl}>schema</a> (currently
				<code>schema_version</code> <code>1.0.0-alpha</code>).
			</li>
		</ul>
		<h6>The columns of primer.bed</h6>
		<p>
			Reference name, start position (0-based), end position, primer name, pool (1-based), strand (<code
				>+</code
			>
			forward, <code>-</code> reverse), and the primer sequence.
		</p>
	</article>

	<article>
		<header>
			<nav>
				<ul>
					<li><strong>How are schemes named and versioned?</strong></li>
				</ul>
			</nav>
		</header>
		<p>
			A scheme is identified canonically by its name, amplicon size and version, separated by
			slashes, for example
			<a href={exampleScheme}><code>artic-sars-cov-2/400/v4.1.0</code></a>. Names are lower case and
			may not contain special characters other than hyphens.
		</p>
		<h6>Versioning</h6>
		<p>
			Versions take the form <code>v{'{major}'}.{'{minor}'}.{'{patch}'}</code>, optionally followed
			by a hyphenated suffix. When updating an existing scheme, keep its name and increment the
			version:
		</p>
		<ul>
			<li>the <strong>major</strong> version for primer changes beyond adding primers;</li>
			<li>
				the <strong>minor</strong> version if only adding primers with respect to an existing version;
			</li>
			<li>the <strong>patch</strong> version for smaller technical changes.</li>
		</ul>
	</article>

	<article>
		<header>
			<nav>
				<ul>
					<li><strong>What does scheme status mean?</strong></li>
				</ul>
			</nav>
		</header>

		<nav>
			<ul>
				<li><span class="pill draft"><b>draft</b></span></li>
				<li>A primer scheme that has been designed but requires further testing and validation.</li>
			</ul>
		</nav>

		<nav>
			<ul>
				<li><span class="pill tested"><b>tested</b></span></li>
				<li>
					A primer scheme that has been translated into a physical primer mixture that has been
					evaluated on samples.
				</li>
			</ul>
		</nav>

		<nav>
			<ul>
				<li><span class="pill validated"><b>validated</b></span></li>
				<li>
					A primer scheme that has been translated into a physical primer mixture and determined to
					work as expected on a range of samples.
				</li>
			</ul>
		</nav>

		<nav>
			<ul>
				<li><span class="pill deprecated"><b>deprecated</b></span></li>
				<li>
					A primer scheme that is no longer recommended for use because it is outdated or has been
					replaced by a better alternative.
				</li>
			</ul>
		</nav>

		<nav>
			<ul>
				<li><span class="pill withdrawn"><b>withdrawn</b></span></li>
				<li>
					A primer scheme that has been removed or retracted so that it is no longer available.
				</li>
			</ul>
		</nav>

		<p>
			Deprecated schemes remain published for reproducibility, but are not recommended for new
			sequencing runs. By default the search shows draft, tested and validated schemes only.
		</p>
	</article>

	<article>
		<header>
			<nav>
				<ul>
					<li><strong>What do the plots show?</strong></li>
				</ul>
			</nav>
		</header>
		<h6>Basic Plot: Figure legend (from top to bottom)</h6>
		<ul>
			<li>Coordinates of amplicons per pool.</li>
		</ul>

		<h6>Advanced Plot: Figure legend (from top to bottom)</h6>
		<ul>
			<li>Coordinates of amplicons per pool.</li>
			<li>
				Proportion of sequences with a base at position in alignment (Base Occupancy) and %GC in a
				sliding window.
			</li>
			<li>Sequence variation at position (Entropy) in a sliding window.</li>
			<li>Coordinates of primers passing thermodynamic filtering.</li>
		</ul>
	</article>

	<article>
		<header>
			<nav>
				<ul>
					<li><strong>How can I add my scheme?</strong></li>
				</ul>
			</nav>
		</header>
		<p>
			Contributions are welcome, especially where sequencing data has been or will be deposited
			publicly. If you have designed a scheme you probably already have
			<code>reference.fasta</code> and <code>primer.bed</code>, and need only to write
			<code>info.json</code>. It is easiest to start from
			<a href="{exampleScheme}/info.json">an existing one</a>. These fields are required:
		</p>
		<ul>
			<li><code>schema_version</code>: currently <code>1.0.0-alpha</code></li>
			<li><code>primer_scheme_name</code> and <code>primer_scheme_version</code></li>
			<li><code>amplicon_size</code>: the approximate amplicon length in bp</li>
			<li><code>primer_scheme_contributor</code>: one or more names or organisations</li>
			<li><code>primer_scheme_target_organism</code>: one or more target organisms</li>
			<li><code>primer_scheme_development_status</code>: one of the statuses above</li>
		</ul>
		<h6>Submitting</h6>
		<p>
			Open a pull request against
			<a href={GITHUB_REPO_URL}>{CATALOG_REPO_OWNER}/{CATALOG_REPO_NAME}</a> if you are comfortable
			doing so, or
			<a href={GITHUB_REPO_ISSUES_URL}>open an issue</a> attaching or linking to your three files and
			we will take it from there. Please also open an issue if there are no existing schemes for your
			target pathogen, so it can be added.
		</p>
		<h6>Validating your scheme first (optional)</h6>
		<p>
			The companion tool <a href="https://github.com/pha4ge/primaschema">primaschema</a> validates
			schemes, manages checksums and generates graphics. It is not necessary in order to contribute,
			but if you would like to use it, install it with <code>pip install primaschema</code>, then
			run
			<code>primaschema rebuild --path {'{scheme-directory}'}/info.json</code> to normalise your
			scheme and add checksums, followed by
			<code>primaschema validate --path {'{scheme-directory}'}/info.json</code> to check it.
		</p>
	</article>
</section>

<style>
	@import '$lib/assets/css/pills.css';
	article header {
		background-color: var(--pico-primary);
		color: rgb(255, 254, 247);
	}
	/* Pico's list styles reset the colour on nav ul/li, which would leave the
	   question text near-black on the dark header. Set it on the descendants. */
	article header nav,
	article header ul,
	article header li,
	article header strong {
		color: rgb(255, 254, 247);
	}
	article header a {
		color: rgb(255, 254, 247);
	}
	article header a:hover {
		color: rgb(255, 254, 247);
		text-decoration: underline;
	}
</style>
