document.addEventListener("DOMContentLoaded", () => {
	// Helpers
	const $ = (sel, ctx = document) => ctx.querySelector(sel);
	const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

	const reels = $("#reels");
	const sections = $$(".reel");
	const videos = sections.map((s) => $("video", s));

	let activeIndex = 0;

	// Ensure only one plays at any time
	function pauseAll(except) {
		videos.forEach((v, i) => {
			if (i !== except) {
				v.pause();
			}
		});
	}

	// Preload the next video lightly (optional micro-opt)
	function warmNext(idx) {
		const next = videos[idx + 1];
		if (!next) return;
		// Switch to auto if it was metadata-only so browser fetches more
		if (next.preload !== "auto") next.preload = "auto";
	}

	// IntersectionObserver: play when ≥75% visible
	const io = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
					const idx = sections.indexOf(entry.target);
					activeIndex = idx;

					const vid = videos[idx];
					pauseAll(idx);

					// iOS: autoplay only if muted; that's our default.
					// If user previously unmuted, play() is still user-gesture initiated.
					vid.play().catch(() => {
						/* ignore */
					});

					// Optional: keep neighbors "warm"
					warmNext(idx);
				}
			});
		},
		{ threshold: [0, 0.75, 1] }
	);

	sections.forEach((sec) => io.observe(sec));

	// Mute toggle on the active section only
	sections.forEach((sec, i) => {
		const btn = $(".mute", sec);
		const vid = $("video", sec);
		btn.addEventListener("click", () => {
			// User gesture -> safe to unmute and play with sound
			vid.muted = !vid.muted;
			btn.textContent = vid.muted ? "🔇" : "🔊";
			btn.setAttribute("aria-pressed", String(!vid.muted));
			btn.setAttribute("aria-label", vid.muted ? "Unmute" : "Mute");

			// Make sure only active plays with current audio state
			if (i === activeIndex) {
				vid.play().catch(() => {});
			} else {
				// If they tapped on a non-active section, snap to it
				sections[i].scrollIntoView({ behavior: "smooth", block: "start" });
			}
		});
	});

	// Keyboard shortcuts (container must have focus)
	reels.tabIndex = 0;
	reels.addEventListener("keydown", (e) => {
		const vid = videos[activeIndex];
		if (!vid) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			sections[Math.min(activeIndex + 1, sections.length - 1)].scrollIntoView({ behavior: "smooth", block: "start" });
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			sections[Math.max(activeIndex - 1, 0)].scrollIntoView({ behavior: "smooth", block: "start" });
		} else if (e.key.toLowerCase() === "m") {
			e.preventDefault();
			vid.muted = !vid.muted;
			const btn = $(".mute", sections[activeIndex]);
			btn.textContent = vid.muted ? "🔇" : "🔊";
			btn.setAttribute("aria-pressed", String(!vid.muted));
			btn.setAttribute("aria-label", vid.muted ? "Unmute" : "Mute");
		} else if (e.code === "Space" || e.key.toLowerCase() === "k") {
			e.preventDefault();
			vid.paused ? vid.play().catch(() => {}) : vid.pause();
		}
	});

	// Safety: pause when tab hidden; resume muted on focus if currently active
	document.addEventListener("visibilitychange", () => {
		const vid = videos[activeIndex];
		if (!vid) return;
		if (document.hidden) vid.pause();
		else vid.play().catch(() => {});
	});

	// Give focus so keyboard works immediately
	window.addEventListener("load", () => reels.focus(), { once: true });
});
