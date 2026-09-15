// Book page — every protected action requires a signed-in, email-verified account.
// Download the book PDF, open the character flipbook, and reveal the full brief are
// all gated; a modal invites the visitor to register (Khách) or sign in.
import { auth, configured, isVerified } from "./auth-core.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const BOOK_PDF = "assets/pdf/book.pdf";
// "Info about character" opens an external flipbook (NHỮNG ANH HÙNG TRÊN VÙNG ĐẤT THÉP).
const CHARACTER_URL = "https://fliphtml5.com/yokno/qbin/NH%E1%BB%AENG_ANH_H%C3%99NG_TR%C3%8AN_V%C3%99NG_%C4%90%E1%BA%A4T_TH%C3%89P/";

const downloadBtn = document.getElementById("downloadBook");
const characterBtn = document.getElementById("characterInfo");
const showMoreBtn = document.getElementById("showMore");
const briefFull = document.getElementById("briefFull");
const briefFade = document.getElementById("briefFade");
const gateEl = document.getElementById("authGate");
const errorModalEl = document.getElementById("downloadError");

let verified = false;
if (configured && auth) {
	onAuthStateChanged(auth, (user) => { verified = isVerified(user); });
}

// Show the account gate (register / sign in).
function openGate() {
	if (gateEl && window.bootstrap) {
		bootstrap.Modal.getOrCreateInstance(gateEl).show();
	} else {
		window.location.href = "signin.html?next=book.html";
	}
}

// Run `action` only for a verified user; otherwise show the account gate.
function requireAccount(action) {
	if (verified) action();
	else openGate();
}

// Show the "file not found" box (Bootstrap modal, with an alert() fallback).
function showDownloadError() {
	if (errorModalEl && window.bootstrap) {
		bootstrap.Modal.getOrCreateInstance(errorModalEl).show();
	} else {
		alert("Lỗi 404: không tìm thấy tệp (Error 404: file cannot be found).");
	}
}

// Check the file exists first; 404 (or network failure) -> error box, else download.
async function downloadBook() {
	try {
		const res = await fetch(BOOK_PDF, { cache: "no-store" });
		if (!res.ok) { showDownloadError(); return; }
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "Nguoi-me-dat-thep.pdf";
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	} catch (err) {
		showDownloadError();
	}
}

function revealBrief() {
	if (briefFull) briefFull.hidden = false;
	if (briefFade) briefFade.hidden = true;
	if (showMoreBtn) showMoreBtn.hidden = true;
}

downloadBtn?.addEventListener("click", (e) => {
	e.preventDefault();
	requireAccount(downloadBook);
});

characterBtn?.addEventListener("click", (e) => {
	e.preventDefault();
	requireAccount(() => window.open(CHARACTER_URL, "_blank", "noopener"));
});

showMoreBtn?.addEventListener("click", (e) => {
	e.preventDefault();
	requireAccount(revealBrief);
});
