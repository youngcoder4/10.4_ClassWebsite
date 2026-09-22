/* quest.html — gate on a verified user, render the 4 video steps,
   and drive the "I Got it" -> "Are you sure" -> upload handoff. */
import { auth, configured, isVerified } from "./auth-core.js";
import { QUEST_IMAGE_COUNT } from "./quest-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const gate = document.getElementById("gate");
const content = document.getElementById("content");
const stepsEl = document.getElementById("steps");

const STEPS = [
	{ n: 1, title: "Bước 1", desc: "Xem clip bước 1 và làm theo hướng dẫn đầu tiên." },
	{ n: 2, title: "Bước 2", desc: "Tiếp tục với bước 2 như trong video." },
	{ n: 3, title: "Bước 3", desc: "Thực hiện bước 3 và chụp lại kết quả." },
	{ n: 4, title: "Bước 4", desc: "Hoàn tất bước 4 — chuẩn bị 4 ảnh để nộp." }
];
const ACCENTS = ["#22c55e", "#3b82f6", "#a855f7", "#eab308"];

function renderSteps() {
	stepsEl.innerHTML = "";
	STEPS.forEach((s, i) => {
		const col = document.createElement("div");
		col.className = "col";
		const src = `assets/video/step${s.n}.mp4`;
		col.innerHTML = `
			<div class="step-card shadow-sm">
				<video class="step-video" controls preload="metadata" playsinline
					poster="" data-step="${s.n}">
					<source src="${src}" type="video/mp4">
				</video>
				<div class="p-3 p-md-4 d-flex align-items-start gap-3">
					<span class="step-badge rounded-circle text-white d-inline-flex align-items-center justify-content-center flex-shrink-0"
						style="background:${ACCENTS[i]}">${s.n}</span>
					<div>
						<h3 class="h5 fw-bold mb-1">${s.title}</h3>
						<p class="text-secondary mb-0">${s.desc}</p>
					</div>
				</div>
			</div>`;
		stepsEl.appendChild(col);

		// Graceful fallback when the clip file isn't uploaded yet.
		const video = col.querySelector("video");
		video.addEventListener("error", () => showMissing(video, s.n), true);
		video.querySelector("source").addEventListener("error", () => showMissing(video, s.n));
	});
}

function showMissing(video, n) {
	if (video.dataset.replaced) return;
	video.dataset.replaced = "1";
	const ph = document.createElement("div");
	ph.className = "step-video-missing";
	ph.innerHTML = `🎬 <span class="ms-2">Clip <b>step${n}.mp4</b> sẽ được thêm sau.<br>(đặt file vào <code>assets/video/</code>)</span>`;
	video.replaceWith(ph);
}

function wireGotIt() {
	const gotIt = document.getElementById("gotIt");
	const verySure = document.getElementById("verySure");
	const modalEl = document.getElementById("sureModal");
	const modal = window.bootstrap ? new window.bootstrap.Modal(modalEl) : null;

	gotIt.addEventListener("click", () => { if (modal) modal.show(); else goUpload(); });
	verySure.addEventListener("click", goUpload);
}

function goUpload() {
	window.location.href = "quest-upload.html";
}

renderSteps();
wireGotIt();

// Only verified users may proceed; everyone else sees the gate.
if (configured && auth) {
	onAuthStateChanged(auth, (user) => {
		if (isVerified(user)) {
			content.classList.remove("d-none");
			gate.classList.add("d-none");
		} else {
			gate.classList.remove("d-none");
			content.classList.add("d-none");
		}
	});
} else {
	gate.classList.remove("d-none");
}
