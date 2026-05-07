<script>
	import pha4geIcon from '$lib/assets/img/PHA4GE-Logo-icon-rgb-rj1du7r7r2d00lit9p7q8z9k9nlkg4s8suqtudjlrs.png';
	import pha4geLandscape from '$lib/assets/img/PHA4GE-Logo-landscape-rgb-scaled.webp';
	import gitHubLogo from '$lib/assets/img/github-mark.svg';
	import { base } from '$app/paths';
</script>

<header class="is-fixed-above-lg is-fixed">
	<div class="container">
		<a class="logo" href="{base}/">
			<img src={pha4geIcon} alt="pha4ge icon" />
			<strong>primer schemes</strong>
		</a>
		<nav class="navbar" data-sveltekit-reload>
			<ul>
				<li><a href="{base}/">Search</a></li>
				<li><a href="{base}/faqs">FAQs</a></li>
				<li><a href="{base}/about">About</a></li>
				<li><a href="https://github.com/pha4ge/primer-schemes">GitHub</a></li>
			</ul>
		</nav>
	</div>
</header>

<main class="container"><slot /></main>

<footer>
	<p>
		pha4ge primer schemes
		<a href="https://github.com/pha4ge/primer-schemes"
			><img class="gitlogo" src={gitHubLogo} alt="Github logo" /></a
		>
	</p>
	<p xmlns:cc="http://creativecommons.org/ns#">
		Unless stated otherwise all work is licensed under <a
			href="http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1"
			target="_blank"
			rel="license noopener noreferrer"
			style="display:inline-block;"
			>CC BY-SA 4.0<img
				alt="Creative Commons Logo"
				style="height:22px!important;margin-left:3px;vertical-align:text-bottom;"
				src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"
			/><img
				alt="Creative Commons Logo"
				style="height:22px!important;margin-left:3px;vertical-align:text-bottom;"
				src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"
			/><img
				alt="Creative Commons Logo"
				style="height:22px!important;margin-left:3px;vertical-align:text-bottom;"
				src="https://mirrors.creativecommons.org/presskit/icons/sa.svg?ref=chooser-v1"
			/></a
		>
	</p>
	<p>
		<img class="footer-logo" src={pha4geLandscape} alt="pha4ge logo" />
	</p>
</footer>

<style>
	@import '$lib/assets/css/main.css';

	header.is-fixed-above-lg {
		z-index: 2;
		position: sticky;
		top: 0;
		background-color: var(--pico-header-background);
		transition: border-top-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
	}
	header.is-fixed-above-lg.is-fixed {
		border-bottom-color: rgba(35, 74, 114, 0.15);
		box-shadow: 0 1px 6px rgba(31, 41, 51, 0.08);
	}

	header {
		z-index: 4;
		position: relative;
		padding: 0.65rem 0;
		border-bottom: var(--pico-border-width) solid transparent;
		margin-bottom: calc(var(--pico-block-spacing-vertical) * 2);
	}

	header .container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	header .container > a {
		margin: calc(var(--pico-spacing) * -0.125) calc(var(--pico-spacing) * -0.25);
		padding: calc(var(--pico-spacing) * 0.125) calc(var(--pico-spacing) * 0.25);
		border-radius: var(--pico-border-radius);
	}

	.logo img {
		height: 44px;
		margin-right: 0.55rem;
	}

	a.logo {
		text-decoration: none;
		font-size: 1.26rem;
		font-weight: 600;
		color: #1f3f5e;
		display: flex;
		align-items: center;
	}
	a.logo:hover {
		text-decoration: none;
		color: #234a72;
	}

	.navbar ul {
		align-items: center;
		gap: 0.3rem;
		margin: 0;
	}

	.navbar a {
		border-radius: 4px;
		padding: 0.35rem 0.65rem;
	}

	.navbar a:hover {
		background: rgba(35, 74, 114, 0.08);
		text-decoration: none;
	}

	.navbar button.secondary {
		border-radius: 4px;
		padding-inline: 0.85rem;
		font-weight: 600;
	}

	footer {
		text-align: center;
		margin-top: 2.5rem;
		border-top: 1px solid rgba(35, 74, 114, 0.14);
		padding: 1.25rem 0;
		background: #f6f8fa;
	}

	.gitlogo {
		height: 22px;
		vertical-align: middle;
		margin-left: 0.25rem;
	}

	.footer-logo {
		height: 40px;
	}

	@media (max-width: 920px) {
		header .container {
			flex-direction: column;
			align-items: stretch;
		}

		.navbar ul {
			flex-wrap: wrap;
			justify-content: center;
		}

		a.logo {
			justify-content: center;
		}
	}
</style>
