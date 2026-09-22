/* quest-upload.html — collect exactly 4 images, push them to
   Firebase Storage, record the submission in the database, and
   flip the user's quest status to "submitted". */
import { auth, configured, isVerified } from "./auth-core.js";
import { db, storage, QUEST_IMAGE_COUNT, shortUserId } from "./quest-config.js";
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
const files = new Array(QUEST_IMAGE_COUNT).fill(null);
let currentUser = null;

function buildSlots() {
	slotsEl.innerHTML = "";
	for (let i = 0; i < QUEST_IMAGE_COUNT; i++) {
		const slot = document.createElement("label");
		slot.className = "slot";
		slot.innerHTML = `
			<span class="slot-num">${i + 1}</span>
			<button type="button" class="slot-remove" aria-label="Xoá ảnh">&times;</button>
			<span class="slot-hint">📷<br>Ảnh ${i + 1}<br><small>bấm để chọn</small></span>
			<input type="file" accept="image/*">`;
		const input = slot.querySelector("input");
		const remove = slot.querySelector(".slot-remove");

		input.addEventListener("change", () => onPick(i, slot, input));
		remove.addEventListener("click", (e) => {
			e.preventDefault();
			files[i] = null;
			slot.classList.remove("filled");
			slot.querySelector("img")?.remove();
			slot.querySelector(".slot-hint").style.display = "";
			input.value = "";
			refreshSubmit();
		});
		slotsEl.appendChild(slot);
	}
}

function onPick(i, slot, input) {
	const f = input.files && input.files[0];
	if (!f) return;
	if (!f.type.startsWith("image/")) { msg("File phải là ảnh.", "danger"); input.value = ""; return; }
	if (f.size > MAX_BYTES) { msg("Ảnh quá lớn (tối đa 8MB).", "danger"); input.value = ""; return; }
	files[i] = f;
	slot.classList.add("filled");
	slot.querySelector("img")?.remove();
	const img = document.createElement("img");
	img.alt = "Ảnh " + (i + 1);
	img.src = URL.createObjectURL(f);
	slot.querySelector(".slot-hint").style.display = "none";
	slot.appendChild(img);
	msg("");
	refreshSubmit();
}

function count() { return files.filter(Boolean).length; }

function refreshSubmit() {
	const c = count();
	submitBtn.textContent = `Nộp bài (${c}/${QUEST_IMAGE_COUNT})`;
	submitBtn.disabled = c !== QUEST_IMAGE_COUNT;
}

function msg(text, kind) {
	uploadMsg.innerHTML = text ? `<div class="alert alert-${kind || "info"} mb-0">${text}</div>` : "";
}

async function submit() {
	if (count() !== QUEST_IMAGE_COUNT || !currentUser) return;
	submitBtn.disabled = true;
	progressWrap.classList.remove("d-none");
	msg("Đang tải ảnh lên…", "info");

	const stamp = Date.now();
	const images = [];
	const paths = [];
	try {
		for (let i = 0; i < files.length; i++) {
			const f = files[i];
			const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
			const path = `submissions/${currentUser.uid}/${stamp}_${i + 1}.${ext}`;
			const r = stRef(storage, path);
			await uploadBytes(r, f, { contentType: f.type });
			images.push(await getDownloadURL(r));
			paths.push(path);
			progressBar.style.width = Math.round(((i + 1) / files.length) * 100) + "%";
		}

		await set(dbRef(db, `submissions/${currentUser.uid}`), {
			uid: currentUser.uid,
			name: currentUser.displayName || currentUser.email,
			email: currentUser.email,
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

buildSlots();
refreshSubmit();
submitBtn.addEventListener("click", submit);

if (configured && auth) {
	onAuthStateChanged(auth, (user) => {
		if (isVerified(user)) {
			currentUser = user;
			content.classList.remove("d-none");
			gate.classList.add("d-none");
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
