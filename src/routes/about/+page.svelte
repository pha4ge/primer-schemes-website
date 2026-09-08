<script>
	import { base } from '$app/paths';
	import {
		GITHUB_REPO_URL,
		GITHUB_REPO_ISSUES_URL,
		GITHUB_REPO_SCHEMES_BASE,
		CATALOG_INDEX_URL,
		CATALOG_REPO_OWNER,
		CATALOG_REPO_NAME
	} from '$lib/config.js';

	const exampleScheme = `${GITHUB_REPO_SCHEMES_BASE}/artic-sars-cov-2/400/v4.1.0`;
</script>

<section>
	<hgroup>
		<h1>About</h1>
	</hgroup>

	<article>
		<header>
			<nav>
				<ul>
					<li><strong>What this is</strong></li>
				</ul>
			</nav>
		</header>
		<p>
			This site is a browsable interface to
			<a href={GITHUB_REPO_URL}>{CATALOG_REPO_OWNER}/{CATALOG_REPO_NAME}</a>, a versioned and
			schematised community repository of tiled amplicon primer scheme definitions for pathogen
			sequencing, created with tools such as
			<a href="https://primalscheme.com">Primal Scheme</a>.
		</p>
		<p>
			The repository exists to eliminate ambiguity in scheme naming and versioning, and to maximise
			the findability, accessibility, interoperability and reusability (<a
				href="https://www.go-fair.org/fair-principles/">FAIRness</a
			>) of primer schemes and the sequencing data derived from them. Each scheme is identified
			canonically by its name, amplicon size and version, for example
			<a href={exampleScheme}><code>artic-sars-cov-2/400/v4.1.0</code></a>.
		</p>
		<p>
			Underpinning it all is a top-level machine readable
			<a href={CATALOG_INDEX_URL}>index</a> of every available scheme definition, which is what this
			site reads.
		</p>
	</article>

	<article>
		<header>
			<nav>
				<ul>
					<li><strong>Using this site</strong></li>
				</ul>
			</nav>
		</header>
		<p>
			Search by scheme name, contributor, target organism or alias, and narrow the results by
			development status, amplicon size, license, organism or contributor. Selecting a scheme
			reveals its amplicon plots, its full metadata, and the BED file and reference sequence it is
			defined by.
		</p>
		<p>
			Every scheme carries a status describing how far through development it is. See the
			<a href="{base}/faqs">FAQs</a> for what each status means, and for what a scheme definition consists
			of.
		</p>
	</article>

	<article>
		<header>
			<nav>
				<ul>
					<li><strong>Tooling and contributing</strong></li>
				</ul>
			</nav>
		</header>
		<p>
			The repository's companion tool
			<a href="https://github.com/pha4ge/primaschema">primaschema</a> automatically validates the
			schemes held here, generates their graphics and manages their checksums. It can also be
			installed on its own with <code>pip install primaschema</code> for fetching, validating and interrogating
			primer schemes.
		</p>
		<p>
			We encourage contributions of any scheme others might wish to use, especially if sequencing
			data has been or will be deposited publicly. The
			<a href="{base}/faqs">FAQs</a> summarise what a submission needs; from there, either open a
			pull request against
			<a href={GITHUB_REPO_URL}>{CATALOG_REPO_OWNER}/{CATALOG_REPO_NAME}</a> or
			<a href={GITHUB_REPO_ISSUES_URL}>open an issue</a> and we will help.
		</p>
	</article>
</section>

<style>
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
