function initReels() {
	const $ = (sel, ctx = document) => ctx.querySelector(sel);
	const reelsEl = $("#reels");

	// ------- Config
	const DATA_URL = "reels.json"; // same folder as index.html

	// ------- Global state
	let sections = [];
	let videos = [];
	let activeIndex = 0;
	let globalMuted = localStorage.getItem("reels_muted") === "false" ? false : true; // default true

	// ------- Build UI from JSON
	fetch(DATA_URL)
		.then((r) => {
			if (!r.ok) throw new Error(`Failed to load ${DATA_URL} (${r.status})`);
			return r.json();
		})
		.then((list) => {
			if (!Array.isArray(list) || list.length === 0) {
				throw new Error("JSON loaded but no reels found.");
			}

			// Build sections
			const frag = document.createDocumentFragment();
			list.forEach((item) => {
				const sec = document.createElement("section");
				sec.className = "reel";
				sec.dataset.id = item.id;

				// Mute button
				const btn = document.createElement("button");
				btn.className = "mute";
				btn.type = "button";
				btn.textContent = "🔇";
				btn.setAttribute("aria-pressed", "true");
				btn.setAttribute("aria-label", "Unmute");

				// Video
				const v = document.createElement("video");
				v.setAttribute("playsinline", "");
				v.setAttribute("preload", "metadata");
				v.poster = item.video.poster;
				v.src = item.video.src;
				v.loop = true; // Reels-like looping

				// Captions track (optional)
				if (item.video.captions) {
					const track = document.createElement("track");
					track.kind = "captions";
					track.srclang = "en";
					track.label = "English";
					track.src = item.video.captions;
					// no "default" — let user toggle later if you add a CC button
					v.appendChild(track);
				}

				// Minimal left/right overlay hooks (optional to fill later)
				// You can add author/music/meta overlays here if you want.

				sec.appendChild(btn);
				sec.appendChild(v);
				frag.appendChild(sec);
			});

			reelsEl.appendChild(frag);

			// Cache references after DOM insert
			sections = [...reelsEl.querySelectorAll(".reel")];
			videos = sections.map((s) => s.querySelector("video"));

			// Init audio UI/state now that videos exist
			applyGlobalMute();
			syncMuteButtons();

			// Wire behavior
			setupIntersection();
			setupMuteButtons();
			setupKeyboard();
			setupPageVisibility();

			// Focus container so ↑/↓ work
			reelsEl.tabIndex = 0;
			reelsEl.focus();

			// Warm the very first video (muted autoplay on intersect)
			// IntersectionObserver will handle play once it's ≥ 75% visible
		})
		.catch((err) => {
			console.error(err);
			reelsEl.innerHTML = `
        <div style="color:#fff; padding:1rem; font:16px system-ui, sans-serif;">
          <strong>Couldn’t load reels.</strong><br/>
          <code>${String(err.message || err)}</code>
        </div>`;
		});

	// ------- Helpers

	function applyGlobalMute() {
		videos.forEach((v) => (v.muted = globalMuted));
		localStorage.setItem("reels_muted", String(globalMuted));
	}

	function syncMuteButtons() {
		sections.forEach((sec) => {
			const btn = sec.querySelector(".mute");
			if (!btn) return;
			btn.textContent = globalMuted ? "🔇" : "🔊";
			btn.setAttribute("aria-pressed", String(!globalMuted));
			btn.setAttribute("aria-label", globalMuted ? "Unmute" : "Mute");
		});
	}

	function pauseAll(exceptIdx) {
		videos.forEach((v, i) => {
			if (i !== exceptIdx) v.pause();
		});
	}

	function warmNext(idx) {
		const next = videos[idx + 1];
		if (next && next.preload !== "auto") next.preload = "auto";
	}

	// ------- Behavior

	function setupIntersection() {
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
						const idx = sections.indexOf(entry.target);
						if (idx === -1) return;
						activeIndex = idx;

						const vid = videos[idx];
						pauseAll(idx);
						vid.muted = globalMuted; // honor global audio state
						vid.play().catch(() => {}); // safe on iOS if muted OR after a gesture
						warmNext(idx);
					}
				});
			},
			{ threshold: [0, 0.75, 1] }
		);

		sections.forEach((sec) => io.observe(sec));
	}

	function setupMuteButtons() {
		sections.forEach((sec) => {
			const btn = sec.querySelector(".mute");
			btn?.addEventListener("click", () => {
				globalMuted = !globalMuted;
				applyGlobalMute();
				syncMuteButtons();
				// User gesture primes audio; ensure current plays with new state
				videos[activeIndex]?.play().catch(() => {});
			});
		});
	}

	function setupKeyboard() {
		reelsEl.addEventListener("keydown", (e) => {
			const vid = videos[activeIndex];
			if (!vid) return;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				sections[Math.min(activeIndex + 1, sections.length - 1)].scrollIntoView({ behavior: "smooth", block: "start" });
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				sections[Math.max(activeIndex - 1, 0)].scrollIntoView({ behavior: "smooth", block: "start" });
			} else if (e.code === "Space" || e.key.toLowerCase() === "k") {
				e.preventDefault();
				vid.paused ? vid.play().catch(() => {}) : vid.pause();
			} else if (e.key.toLowerCase() === "m") {
				e.preventDefault();
				globalMuted = !globalMuted;
				applyGlobalMute();
				syncMuteButtons();
				videos[activeIndex]?.play().catch(() => {});
			}
		});
	}

	function setupPageVisibility() {
		document.addEventListener("visibilitychange", () => {
			const vid = videos[activeIndex];
			if (!vid) return;
			if (document.hidden) vid.pause();
			else vid.play().catch(() => {});
		});
	}
}

document.addEventListener("DOMContentLoaded", initReels);
