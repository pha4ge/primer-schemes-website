<script>
	export let status = '';
	export let label = undefined;
</script>

<span class="pill {status?.toLowerCase()}">
	<span class="pill-text">{label ?? status}</span>
</span>

<style>
	@import '$lib/assets/css/pills.css';

	.pill-text {
		font-weight: 600;
		line-height: 1;
	}
</style>
