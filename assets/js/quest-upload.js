/* quest-upload.html — collect 1 to 5 images, push them to Firebase
   Storage, record the submission in the database, and flip the
   user's quest status to "submitted". */
import { auth, configured, isVerified } from "./auth-core.js";
import { db, storage, QUEST_IMAGE_MIN, QUEST_IMAGE_MAX, randomCode } from "./quest-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { ref as dbRef, get, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { ref as stRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const gate = document.getElementById("gate");
const content = document.getElementById("content");
const slotsEl = document.getElementById("slots");
const submitBtn = document.getElementById("submitBtn");
const uploadMsg = document.getElementById("uploadMsg");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const formEl = document.getElementById("form");
const thankyou = document.getElementById("thankyou");
const alreadyBox = document.getElementById("alreadyBox");

const MAX_BYTES = 8 * 1024 * 1024; // 8MB per image
let picks = [];                    // [{ file, url }] — 1..QUEST_IMAGE_MAX
let currentUser = null;
let userCode = "";

const userCodeEl = document.getElementById("userCode");
const copyCodeBtn = document.getElementById("copyCode");

copyCodeBtn?.addEventListener("click", async () => {
	if (!userCode) return;
	try { await navigator.clipboard.writeText(userCode); } catch (_) {}
	copyCodeBtn.textContent = "✓ Đã chép";
	setTimeout(() => (copyCodeBtn.textContent = "📋 Sao chép"), 1400);
});

function renderGallery() {
	slotsEl.innerHTML = "";

	picks.forEach((p, i) => {
		const slot = document.createElement("div");
		slot.className = "slot filled";
		slot.innerHTML = `
			<span class="slot-num">${i + 1}</span>
			<button type="button" class="slot-remove" aria-label="Xoá ảnh">&times;</button>`;
		const img = document.createElement("img");
		img.alt = "Ảnh " + (i + 1);
		img.src = p.url;
		slot.appendChild(img);
		slot.querySelector(".slot-remove").addEventListener("click", () => {
			URL.revokeObjectURL(p.url);
			picks.splice(i, 1);
			renderGallery();
			refreshSubmit();
		});
		slotsEl.appendChild(slot);
	});

	// "add" tile, hidden once the max is reached
	if (picks.length < QUEST_IMAGE_MAX) {
		const add = document.createElement("label");
		add.className = "slot slot-add";
		add.innerHTML = `
			<span class="slot-hint">➕<br>Thêm ảnh<br><small>${picks.length}/${QUEST_IMAGE_MAX}</small></span>
			<input type="file" accept="image/*" multiple>`;
		add.querySelector("input").addEventListener("change", (e) => onAdd(e.target));
		slotsEl.appendChild(add);
	}
}

function onAdd(input) {
	let rejected = 0;
	for (const f of [...(input.files || [])]) {
		if (picks.length >= QUEST_IMAGE_MAX) { msg(`Tối đa ${QUEST_IMAGE_MAX} ảnh.`, "warning"); break; }
		if (!f.type.startsWith("image/") || f.size > MAX_BYTES) { rejected++; continue; }
		picks.push({ file: f, url: URL.createObjectURL(f) });
	}
	input.value = "";
	msg(rejected ? "Một số file bị bỏ qua (không phải ảnh hoặc lớn hơn 8MB)." : "", "warning");
	renderGallery();
	refreshSubmit();
}

function count() { return picks.length; }

function refreshSubmit() {
	const c = picks.length;
	submitBtn.textContent = c ? `Nộp bài (${c} ảnh)` : "Nộp bài";
	submitBtn.disabled = c < QUEST_IMAGE_MIN || c > QUEST_IMAGE_MAX;
}

function msg(text, kind) {
	uploadMsg.innerHTML = text ? `<div class="alert alert-${kind || "info"} mb-0">${text}</div>` : "";
}

async function submit() {
	const c = picks.length;
	if (c < QUEST_IMAGE_MIN || c > QUEST_IMAGE_MAX || !currentUser) return;
	submitBtn.disabled = true;
	progressWrap.classList.remove("d-none");
	msg("Đang tải ảnh lên…", "info");

	const stamp = Date.now();
	const images = [];
	const paths = [];
	try {
		for (let i = 0; i < picks.length; i++) {
			const f = picks[i].file;
			const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
			const path = `submissions/${currentUser.uid}/${stamp}_${i + 1}.${ext}`;
			const r = stRef(storage, path);
			await uploadBytes(r, f, { contentType: f.type });
			images.push(await getDownloadURL(r));
			paths.push(path);
			progressBar.style.width = Math.round(((i + 1) / picks.length) * 100) + "%";
		}

		await set(dbRef(db, `submissions/${currentUser.uid}`), {
			uid: currentUser.uid,
			name: currentUser.displayName || currentUser.email,
			email: currentUser.email,
			userCode,
			images,
			paths,
			status: "pending",
			createdAt: serverTimestamp()
		});
		await set(dbRef(db, `users/${currentUser.uid}/quest/status`), "submitted");
		await set(dbRef(db, `users/${currentUser.uid}/profile`), {
			name: currentUser.displayName || currentUser.email,
			email: currentUser.email
		});

		formEl.classList.add("d-none");
		thankyou.classList.remove("d-none");
		window.scrollTo({ top: 0, behavior: "smooth" });
	} catch (err) {
		console.error(err);
		msg("Lỗi khi tải lên: " + (err && err.message ? err.message : err) + " — thử lại.", "danger");
		submitBtn.disabled = false;
		progressWrap.classList.add("d-none");
	}
}

// One random code per user: reuse the saved one, or make + save it once.
async function loadOrCreateCode(user) {
	const codeRef = dbRef(db, `users/${user.uid}/questCode`);
	try {
		const snap = await get(codeRef);
		let code = snap.val();
		if (!code) { code = randomCode(); await set(codeRef, code); }
		userCode = code;
	} catch (_) {
		userCode = userCode || randomCode(); // offline fallback (not persisted)
	}
	if (userCodeEl) userCodeEl.textContent = userCode;
}

async function checkExisting(user) {
	try {
		const snap = await get(dbRef(db, `users/${user.uid}/quest/status`));
		const s = snap.val();
		if (s === "submitted") {
			formEl.classList.add("d-none");
			alreadyBox.classList.remove("d-none");
			alreadyBox.innerHTML = "Bạn đã nộp bài rồi — đang chờ admin duyệt. ⏳ ETA 1 ngày.";
		} else if (s === "approved") {
			formEl.classList.add("d-none");
			alreadyBox.classList.remove("d-none");
			alreadyBox.className = "alert alert-success";
			alreadyBox.innerHTML = 'Quest của bạn đã được duyệt! 🎉 Vào <a href="minigame.html" class="alert-link">Minigame</a> để chơi.';
		}
	} catch (_) {}
}

renderGallery();
refreshSubmit();
submitBtn.addEventListener("click", submit);

if (configured && auth) {
	onAuthStateChanged(auth, (user) => {
		if (isVerified(user)) {
			currentUser = user;
			content.classList.remove("d-none");
			gate.classList.add("d-none");
			loadOrCreateCode(user);
			checkExisting(user);
		} else {
			currentUser = null;
			gate.classList.remove("d-none");
			content.classList.add("d-none");
		}
	});
} else {
	gate.classList.remove("d-none");
}
