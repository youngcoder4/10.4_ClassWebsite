/* minigame.html — token candy spinner for Lớp 10.4.
   One reel, no case pick. Each spin costs 1 token, lands on a
   candy prize (limited stock) or "Try again". A win logs a proof
   id the student screenshots to claim the real prize. */
import { auth, configured, isVerified } from "./auth-core.js";
import { db, PRIZES, TRY_AGAIN, makeWinId } from "./quest-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
	ref as dbRef, child, onValue, get, runTransaction, push, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const gate = document.getElementById("gate");
const content = document.getElementById("content");
const prizeCards = document.getElementById("prizeCards");
const strip = document.getElementById("strip");
const roller = document.getElementById("roller");
const spinBtn = document.getElementById("spinBtn");
const hint = document.getElementById("hint");
const hintTok = document.getElementById("hintTok");
const tokenChip = document.getElementById("tokenChip");
const tokenVal = document.getElementById("tokenVal");
const noToken = document.getElementById("noToken");

const winModalEl = document.getElementById("winModal");
const winModal = window.bootstrap ? new window.bootstrap.Modal(winModalEl) : null;
const winEmoji = document.getElementById("winEmoji");
const winName = document.getElementById("winName");
const winIdEl = document.getElementById("winId");
const winUser = document.getElementById("winUser");
const claimStep = document.getElementById("claimStep");
const proofStep = document.getElementById("proofStep");
const studentFields = document.getElementById("studentFields");
const parentFields = document.getElementById("parentFields");
const claimErr = document.getElementById("claimErr");
const claimConfirm = document.getElementById("claimConfirm");
const fStudentId = document.getElementById("fStudentId");
const fStudentName = document.getElementById("fStudentName");
const fStudentClass = document.getElementById("fStudentClass");
const fKidName = document.getElementById("fKidName");
const fKidClass = document.getElementById("fKidClass");

let pendingWin = null; // { winner, winId }

const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
const STRIP_LEN = 60, WIN_INDEX = 52;
const ALL = [...PRIZES, TRY_AGAIN];
const byId = Object.fromEntries(ALL.map((p) => [p.id, p]));

let user = null, tokens = 0, inventory = {}, spinning = false;

/* ---------- boot: seed inventory once, then live-watch ---------- */
async function seedInventory() {
	await runTransaction(dbRef(db, "inventory"), (cur) => {
		if (cur) return cur;
		const seed = {};
		PRIZES.forEach((p) => (seed[p.id] = p.stock));
		return seed;
	}).catch(() => {});
}

function watchInventory() {
	onValue(dbRef(db, "inventory"), (snap) => {
		inventory = snap.val() || {};
		renderPrizeCards();
	});
}

function watchTokens() {
	onValue(dbRef(db, `users/${user.uid}/tokens`), (snap) => {
		tokens = snap.val() || 0;
		renderTokens();
	});
}

/* ---------- render ---------- */
function renderTokens() {
	tokenChip.classList.remove("d-none");
	tokenVal.textContent = tokens;
	hintTok.textContent = tokens;
	noToken.classList.toggle("d-none", tokens > 0 || spinning);
	if (!spinning) {
		spinBtn.disabled = tokens < 1;
		hint.innerHTML = tokens < 1 ? "Hết token — làm Quest để nhận thêm" : `Bạn có <b>${tokens}</b> token`;
	}
}

function renderPrizeCards() {
	prizeCards.innerHTML = "";
	PRIZES.forEach((p) => {
		const left = inventory[p.id] != null ? inventory[p.id] : p.stock;
		const out = left <= 0;
		const col = document.createElement("div");
		col.className = "col";
		col.innerHTML = `
			<div class="prize-card ${out ? "out" : ""}" style="border-top:4px solid ${p.accent}">
				<div class="pc-emoji">${p.emoji}</div>
				<div class="pc-name">${p.name}</div>
				<div class="pc-left">
					${out
						? '<span class="badge text-bg-secondary">Hết quà</span>'
						: `<span class="badge" style="background:${p.accent}">Còn ${left}</span>`}
				</div>
			</div>`;
		prizeCards.appendChild(col);
	});
}

/* ---------- reel ---------- */
function displayPick() {
	// visual filler — any prize (even sold-out, as bait) or try-again
	const tot = ALL.reduce((s, p) => s + p.weight, 0);
	let r = Math.random() * tot;
	for (const p of ALL) { r -= p.weight; if (r <= 0) return p; }
	return TRY_AGAIN;
}

function makeTile(p) {
	const el = document.createElement("div");
	el.className = "tile";
	el.style.setProperty("--tc", p.accent);
	el.innerHTML = `<span class="t-emoji">${p.emoji}</span><span class="t-lab">${p.name}</span>`;
	return el;
}

function buildStrip(winner) {
	strip.style.transition = "none";
	strip.style.transform = "translate(0,-50%)";
	strip.innerHTML = "";
	for (let i = 0; i < STRIP_LEN; i++) {
		strip.appendChild(makeTile(i === WIN_INDEX ? winner : displayPick()));
	}
}

function pickWinner() {
	const pool = [];
	PRIZES.forEach((p) => { if ((inventory[p.id] || 0) > 0) pool.push(p); });
	pool.push(TRY_AGAIN);
	const tot = pool.reduce((s, p) => s + p.weight, 0);
	let r = Math.random() * tot;
	for (const p of pool) { r -= p.weight; if (r <= 0) return p; }
	return TRY_AGAIN;
}

/* ---------- spin ---------- */
async function spin() {
	if (spinning || !user) return;
	if (tokens < 1) { renderTokens(); return; }

	spinning = true;
	spinBtn.disabled = true;
	spinBtn.textContent = "Đang quay…";
	hint.textContent = "";
	roller.classList.remove("done");

	// 1) spend one token (transaction guards against races / stale reads)
	const spend = await runTransaction(dbRef(db, `users/${user.uid}/tokens`), (c) =>
		(c || 0) < 1 ? undefined : c - 1
	);
	if (!spend.committed) {
		spinning = false;
		spinBtn.textContent = "Quay (1 token)";
		renderTokens();
		return;
	}

	// 2) refresh inventory, choose a winner, reserve it if it's a real prize
	try {
		const invSnap = await get(dbRef(db, "inventory"));
		inventory = invSnap.val() || {};
	} catch (_) {}
	let winner = pickWinner();
	if (winner.id !== TRY_AGAIN.id) {
		const res = await runTransaction(child(dbRef(db, "inventory"), winner.id), (c) =>
			!c || c <= 0 ? undefined : c - 1
		);
		if (!res.committed) winner = TRY_AGAIN; // last one was just taken
	}

	// 3) animate the reel to that winner, then resolve
	buildStrip(winner);
	runReel(winner, () => finish(winner));
}

function runReel(winner, done) {
	requestAnimationFrame(() => {
		const tiles = strip.children, first = tiles[0];
		const step = tiles[1].offsetLeft - first.offsetLeft;
		const winTile = tiles[WIN_INDEX];
		const center = roller.clientWidth / 2;
		const jitter = (Math.random() * 2 - 1) * (winTile.offsetWidth * 0.32);
		const finalX = center - (winTile.offsetLeft + winTile.offsetWidth / 2) + jitter;
		const dur = reduce ? 500 : 5200;

		strip.style.transition = "none";
		strip.style.transform = "translate(0,-50%)";
		void strip.offsetWidth;
		strip.style.transition = `transform ${dur}ms ${reduce ? "ease-out" : "cubic-bezier(0,0.11,0.33,1)"}`;
		strip.style.transform = `translate(${finalX}px,-50%)`;

		let ended = false;
		const end = () => {
			if (ended) return;
			ended = true;
			strip.removeEventListener("transitionend", end);
			winTile.classList.add("win");
			roller.classList.add("done");
			done();
		};
		strip.addEventListener("transitionend", end);
		setTimeout(end, dur + 200);
	});
}

async function finish(winner) {
	spinning = false;
	spinBtn.textContent = "Quay (1 token)";
	renderTokens();

	if (winner.id === TRY_AGAIN.id) {
		hint.innerHTML = `😅 Chưa trúng lần này — thử lại! Bạn còn <b>${tokens}</b> token`;
		return;
	}

	// hold the win; the proof id is revealed after the claim form is filled
	pendingWin = { winner, winId: makeWinId(winner.code) };
	winEmoji.textContent = winner.emoji;
	winName.textContent = winner.name;
	claimErr.textContent = "";
	resetClaimForm();
	claimStep.classList.remove("d-none");
	proofStep.classList.add("d-none");
	if (winModal) winModal.show();
	hint.innerHTML = `🎉 Trúng <b>${winner.name}</b>! Điền thông tin để nhận quà.`;
}

/* ---------- claim form (student / parent) ---------- */
function claimType() {
	const el = document.querySelector('input[name="claimType"]:checked');
	return el ? el.value : "student";
}
function resetClaimForm() {
	fStudentId.value = fStudentName.value = fStudentClass.value = "";
	fKidName.value = fKidClass.value = "";
	toggleClaimFields();
}
function toggleClaimFields() {
	const t = claimType();
	studentFields.classList.toggle("d-none", t !== "student");
	parentFields.classList.toggle("d-none", t !== "parent");
}
document.querySelectorAll('input[name="claimType"]').forEach((r) =>
	r.addEventListener("change", () => { claimErr.textContent = ""; toggleClaimFields(); })
);

async function submitClaim() {
	if (!pendingWin || !user) return;
	const t = claimType();
	let name, classId, payload;

	if (t === "student") {
		const id = fStudentId.value.trim();
		const nm = fStudentName.value.trim();
		const cls = fStudentClass.value.trim();
		if (!id || !nm || !cls) { claimErr.textContent = "Điền đủ mã số, tên và lớp."; return; }
		name = nm; classId = cls;
		payload = { studentId: id, studentName: nm, studentClass: cls };
	} else {
		const kid = fKidName.value.trim();
		const cls = fKidClass.value.trim();
		if (!kid || !cls) { claimErr.textContent = "Điền tên và lớp của con."; return; }
		name = kid; classId = cls;
		payload = { kidName: kid, kidClass: cls };
	}

	claimConfirm.disabled = true;
	const { winner, winId } = pendingWin;
	const record = {
		winId, prize: winner.name, prizeId: winner.id,
		uid: user.uid, account: user.displayName || user.email, email: user.email,
		type: t, name, classId,
		createdAt: serverTimestamp(),
		...payload
	};
	try {
		await push(dbRef(db, "prizeClaims"), record);
		await push(dbRef(db, "wins"), record).catch(() => {});
		await push(dbRef(db, `users/${user.uid}/prizes`), {
			prize: winner.name, prizeId: winner.id, winId, createdAt: serverTimestamp()
		}).catch(() => {});
	} catch (err) {
		console.error(err);
		claimErr.textContent = "Lỗi khi lưu: " + (err && err.message ? err.message : err);
		claimConfirm.disabled = false;
		return;
	}

	// reveal proof id
	winIdEl.textContent = winId;
	winUser.textContent = name + " · lớp " + classId + " · " + (t === "parent" ? "Phụ huynh" : "Học sinh");
	claimStep.classList.add("d-none");
	proofStep.classList.remove("d-none");
	claimConfirm.disabled = false;
	pendingWin = null;
	hint.innerHTML = `🎉 Đã nhận <b>${winner.name}</b>! Mã: <b>${winId}</b> — nhớ chụp màn hình.`;
}

/* ---------- wiring ---------- */
spinBtn.addEventListener("click", spin);
claimConfirm.addEventListener("click", submitClaim);

if (configured && auth) {
	onAuthStateChanged(auth, async (u) => {
		if (isVerified(u)) {
			user = u;
			content.classList.remove("d-none");
			gate.classList.add("d-none");
			await seedInventory();
			watchInventory();
			watchTokens();
		} else {
			user = null;
			gate.classList.remove("d-none");
			content.classList.add("d-none");
		}
	});
} else {
	gate.classList.remove("d-none");
}
