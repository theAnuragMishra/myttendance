<div class="orbit">
	<div></div>
	<div></div>
</div>

<style>
	.orbit {
		position: relative;
		width: 40px;
		height: 40px;
		margin: 40px auto;
	}
	.orbit div {
		width: 12px;
		height: 12px;
		background: #3498db;
		border-radius: 50%;
		position: absolute;
		animation: orbit 1s linear infinite;
	}
	.orbit div:nth-child(2) {
		background: #9b59b6;
		animation-delay: -0.5s;
	}
	@keyframes orbit {
		0% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(28px, 0);
		}
		50% {
			transform: translate(28px, 28px);
		}
		75% {
			transform: translate(0, 28px);
		}
		100% {
			transform: translate(0, 0);
		}
	}
</style>
