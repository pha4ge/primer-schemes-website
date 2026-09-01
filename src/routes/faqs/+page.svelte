<script>
	import { GITHUB_REPO_URL, CATALOG_REPO_OWNER, CATALOG_REPO_NAME } from '$lib/config.js';
</script>

<main>
	<section>
		<hgroup>
			<h1>FAQs</h1>
		</hgroup>

		<article>
			<header>
				<nav>
					<li><strong>How can I add my scheme?</strong></li>
				</nav>
			</header>
			<h6>Open a pull request</h6>
			<p>
				Submit a pull request to
				<a href={GITHUB_REPO_URL}>{CATALOG_REPO_OWNER}/{CATALOG_REPO_NAME}</a>
			</p>
			<h6>Contact us</h6>
			<p>
				Email us at
				<a href="mailto:b.constantinides@bham.ac.uk">b.constantinides@bham.ac.uk</a> and
					<a href="mailto:c.g.kent@bham.ac.uk">c.g.kent@bham.ac.uk</a>
			</p>
		</article>

		<article>
			<header>
				<nav>
					<li><strong>What does scheme status mean?</strong></li>
				</nav>
			</header>

			<nav>
				<ul>
					<li><span class="pill draft"><b>draft</b></span></li>
					<li>
						The scheme design has been reviewed <i>in silico</i>. Primers have been checked for
						thermodynamic properties, off-target binding, and coverage against reference sequences,
						but the scheme has not yet been tested in a wet-lab setting.
					</li>
				</ul>
			</nav>

			<nav>
				<ul>
					<li><span class="pill tested"><b>tested</b></span></li>
					<li>
						The scheme has been run in the laboratory and shown to produce amplicons successfully.
						Wet-lab validation has been performed, but the scheme has not yet been formally published
						or independently validated.
					</li>
				</ul>
			</nav>

			<nav>
				<ul>
					<li><span class="pill validated"><b>validated</b></span></li>
					<li>
						The scheme has been independently validated and/or described in a peer-reviewed
						publication. This is the highest confidence status for an active scheme.
					</li>
				</ul>
			</nav>

			<nav>
				<ul>
					<li><span class="pill deprecated"><b>deprecated</b></span></li>
					<li>
						The scheme has been superseded, typically by a newer version or a better-performing
						alternative. It remains available for reproducibility but is no longer recommended for
						new sequencing runs.
					</li>
				</ul>
			</nav>

			<nav>
				<ul>
					<li><span class="pill withdrawn"><b>withdrawn</b></span></li>
					<li>
						The scheme has been withdrawn and should not be used. This may be due to design errors
						or other issues identified after release.
					</li>
				</ul>
			</nav>
		</article>
	</section>
</main>

<article>
	<header>
		<nav>
			<li><strong>What do the plots show?</strong></li>
		</nav>
	</header>
	<h6>Basic Plot: Figure legend (from top to bottom)</h6>
	<ul><li>Coordinates of amplicons per pool.</li></ul>

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

<style>
	@import '$lib/assets/css/pills.css';
	article header {
		background-color: var(--pico-primary);
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
