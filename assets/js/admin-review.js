/* admin-review.html — the admin hub. Unlocked only via the login
   page hotkey (Ctrl+Shift+Alt+A + password), which sets a session
   flag. Two tabs:
     • Review Image — approve (grant tokens + email + delete images)
       or deny (email a reason + delete images).
     • Prize — every claimed prize with student/parent details. */
import { auth, configured } from "./auth-core.js";
import {
	db, storage, adminUnlocked, sendQuestEmail, emailjsReady, TOKENS_ON_APPROVE
} from "./quest-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
	ref as dbRef, onValue, remove, runTransaction, push, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { set as dbSet } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { ref as stRef, deleteObject } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const gate = document.getElementById("gate");
const content = document.getElementById("content");
const queueEl = document.getElementById("queue");
const reviewEmpty = document.getElementById("reviewEmpty");
const reviewCount = document.getElementById("reviewCount");
const prizeRows = document.getElementById("prizeRows");
const prizeEmpty = document.getElementById("prizeEmpty");
const prizeCount = document.getElementById("prizeCount");
const emailWarn = document.getElementById("emailWarn");
const authWarn = document.getElementById("authWarn");

const denyReason = document.getElementById("denyReason");
const denyErr = document.getElementById("denyErr");
const denyConfirm = document.getElementById("denyConfirm");
const denyModalEl = document.getElementById("denyModal");
const denyModal = window.bootstrap ? new window.bootstrap.Modal(denyModalEl) : null;

let denyTarget = null;

function esc(s) {
	return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- tabs ---------- */
document.getElementById("adminTabs").addEventListener("click", (e) => {
	const btn = e.target.closest("[data-tab]");
	if (!btn) return;
	document.querySelectorAll("#adminTabs .nav-link").forEach((b) => b.classList.remove("active"));
	btn.classList.add("active");
	const tab = btn.dataset.tab;
	document.getElementById("tab-review").classList.toggle("d-none", tab !== "review");
	document.getElementById("tab-prize").classList.toggle("d-none", tab !== "prize");
});

/* ---------- helpers ---------- */
async function deleteImages(sub) {
	const paths = (sub && sub.paths) || [];
	await Promise.all(paths.map((p) => deleteObject(stRef(storage, p)).catch(() => {})));
}
async function notifyUser(sub, subject, message) {
	await push(dbRef(db, `users/${sub.uid}/notifications`), {
		subject, message, createdAt: serverTimestamp()
	}).catch(() => {});
	await sendQuestEmail({ toEmail: sub.email, toName: sub.name, subject, message });
}

/* ---------- review: accept / deny ---------- */
async function accept(sub, tokens, row) {
	setBusy(row, true);
	try {
		await runTransaction(dbRef(db, `users/${sub.uid}/tokens`), (cur) => (cur || 0) + tokens);
		await dbSet(dbRef(db, `users/${sub.uid}/quest/status`), "approved");

		const subject = "Quest 10.4 — Bạn đã nhận token! 🎉";
		const message =
			`Xin chào ${sub.name || ""},\n\n` +
			`Bài nộp quest của bạn đã được DUYỆT.\n` +
			`Bạn vừa nhận ${tokens} token để chơi vòng quay quà của lớp 10.4.\n\n` +
			`Vào mục Prize → vòng quay trên website để chơi. Chúc bạn may mắn! 🍬`;
		await notifyUser(sub, subject, message);

		await deleteImages(sub);
		await remove(dbRef(db, `submissions/${sub.uid}`));
	} catch (err) {
		console.error(err);
		alert("Lỗi khi duyệt: " + (err && err.message ? err.message : err));
		setBusy(row, false);
	}
}

async function deny(sub, reason) {
	try {
		await dbSet(dbRef(db, `users/${sub.uid}/quest/status`), "denied");
		const subject = "Quest 10.4 — Bài nộp chưa được duyệt";
		const message =
			`Xin chào ${sub.name || ""},\n\n` +
			`Rất tiếc, bài nộp quest của bạn chưa được duyệt.\n\n` +
			`Lý do: ${reason}\n\n` +
			`Bạn có thể làm lại quest và nộp lại nhé.`;
		await notifyUser(sub, subject, message);
		await deleteImages(sub);
		await remove(dbRef(db, `submissions/${sub.uid}`));
	} catch (err) {
		console.error(err);
		alert("Lỗi khi từ chối: " + (err && err.message ? err.message : err));
	}
}

function setBusy(row, busy) {
	if (row) row.querySelectorAll("button").forEach((b) => (b.disabled = busy));
}

/* ---------- render: review queue ---------- */
function renderQueue(subs) {
	queueEl.innerHTML = "";
	const list = Object.values(subs || {}).filter((s) => s && s.status === "pending");
	list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
	reviewCount.textContent = list.length;
	reviewEmpty.classList.toggle("d-none", list.length !== 0);

	for (const sub of list) {
		const card = document.createElement("div");
		card.className = "card shadow-sm border-0";
		const when = sub.createdAt ? new Date(sub.createdAt).toLocaleString("vi-VN") : "";
		card.innerHTML = `
			<div class="card-body">
				<div class="d-flex justify-content-between flex-wrap gap-2 mb-3">
					<div>
						<div class="fw-bold fs-5">${esc(sub.name)}
							${sub.userCode ? `<span class="badge text-bg-dark ms-1" title="Mã dán trong bình luận">🆔 ${esc(sub.userCode)}</span>` : ""}</div>
						<div class="text-secondary small">${esc(sub.email)}</div>
					</div>
					<div class="text-secondary small text-end">${esc(when)}</div>
				</div>
				<div class="sub-thumbs mb-3">
					${(sub.images || []).map((u, i) =>
						`<a href="${esc(u)}" target="_blank" rel="noopener" title="Ảnh ${i + 1}"><img src="${esc(u)}" alt="Ảnh ${i + 1}"></a>`
					).join("")}
				</div>
				<div class="d-flex flex-wrap align-items-center gap-2 btn-row">
					<div class="input-group" style="max-width:200px">
						<span class="input-group-text">🎟️ Token</span>
						<input type="number" class="form-control token-input" value="${TOKENS_ON_APPROVE}" min="1" max="999">
					</div>
					<button class="btn btn-success fw-bold accept-btn">✔ Accept</button>
					<button class="btn btn-outline-danger deny-btn">✖ Deny</button>
				</div>
			</div>`;

		const tokenInput = card.querySelector(".token-input");
		const row = card.querySelector(".btn-row");
		card.querySelector(".accept-btn").addEventListener("click", () => {
			const t = Math.max(1, parseInt(tokenInput.value, 10) || TOKENS_ON_APPROVE);
			if (confirm(`Duyệt và cấp ${t} token cho ${sub.name}?`)) accept(sub, t, row);
		});
		card.querySelector(".deny-btn").addEventListener("click", () => {
			denyTarget = sub;
			denyReason.value = "";
			denyErr.textContent = "";
			if (denyModal) denyModal.show();
		});
		queueEl.appendChild(card);
	}
}

/* ---------- render: prize claims ---------- */
function renderPrizes(claims) {
	prizeRows.innerHTML = "";
	const list = Object.values(claims || {});
	list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
	prizeCount.textContent = list.length;
	prizeEmpty.classList.toggle("d-none", list.length !== 0);

	for (const c of list) {
		const when = c.createdAt ? new Date(c.createdAt).toLocaleString("vi-VN") : "";
		const typeBadge = c.type === "parent"
			? '<span class="badge text-bg-info">Phụ huynh</span>'
			: '<span class="badge text-bg-primary">Học sinh</span>';
		const extra = c.type === "student" && c.studentId
			? `<div class="text-secondary small">MSHS: ${esc(c.studentId)}</div>` : "";
		const tr = document.createElement("tr");
		tr.innerHTML = `
			<td class="ps-3 small">${esc(when)}</td>
			<td><div class="fw-semibold">${esc(c.name)}</div>${extra}
				<div class="text-secondary small">${esc(c.account || "")}</div></td>
			<td>${esc(c.classId)}</td>
			<td>${typeBadge}</td>
			<td>${esc(c.prize)}</td>
			<td class="pe-3"><code>${esc(c.winId)}</code></td>`;
		prizeRows.appendChild(tr);
	}
}

/* ---------- wiring ---------- */
denyConfirm.addEventListener("click", async () => {
	const reason = denyReason.value.trim();
	if (!reason) { denyErr.textContent = "Hãy nhập lý do."; return; }
	if (!denyTarget) return;
	denyConfirm.disabled = true;
	await deny(denyTarget, reason);
	denyConfirm.disabled = false;
	if (denyModal) denyModal.hide();
	denyTarget = null;
});

function start() {
	if (!emailjsReady()) emailWarn.classList.remove("d-none");
	content.classList.remove("d-none");
	gate.classList.add("d-none");

	// warn if no Firebase account is signed in (writes will be blocked by rules)
	if (configured && auth) {
		onAuthStateChanged(auth, (u) => authWarn.classList.toggle("d-none", !!u));
	}

	onValue(dbRef(db, "submissions"), (snap) => renderQueue(snap.val() || {}));
	onValue(dbRef(db, "prizeClaims"), (snap) => renderPrizes(snap.val() || {}));
}

if (adminUnlocked()) {
	start();
} else {
	gate.classList.remove("d-none");
	content.classList.add("d-none");
}
