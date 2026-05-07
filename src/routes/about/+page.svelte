<script>
	import { base } from '$app/paths';
</script>

<main>
	<h1>About</h1>
	<article>
		<p>
			This site is a browsable interface to <a href="https://github.com/pha4ge/primer-schemes"
				>pha4ge/primer-schemes</a
			>, a versioned and schematised community repository of tiled amplicon primer scheme
			definitions for pathogen sequencing. The repository is built around a top-level machine readable
			<a href="https://github.com/pha4ge/primer-schemes/blob/main/index.json">index</a> of available
			scheme definitions, with the objective of eliminating ambiguity in scheme naming and versioning
			and maximising the findability, accessibility, interoperability and reusability (<a
				href="https://www.go-fair.org/fair-principles/">FAIRness</a
			>) of primer schemes and associated sequencing data. An example of a canonical primer scheme
			name is <code>sars-cov-2/midnight/1200/v1.0.0</code>.
		</p>
		<p>
			Each scheme has a status indicating its development state (see <a href="{base}/faqs">FAQs</a>
			for more information). Selecting a scheme reveals amplicon plots, scheme metadata, the BED file
			and reference sequence(s). To request that a scheme be tracked here, open a pull request or issue
			on <a href="https://github.com/pha4ge/primer-schemes">pha4ge/primer-schemes</a>.
		</p>
	</article>
</main>

<style>
	h1 {
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	p {
		font-size: 1.2rem;
		line-height: 1.5;
		margin-bottom: 1rem;
	}
</style>
