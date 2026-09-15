// Register a new account (role: Khách/Visitor or Phụ huynh/Parent) with email +
// password (then email verification), or with Google (pre-verified — straight in).
// Teacher/student accounts are NOT self-registered — the class adds them manually.
import { auth, configured } from "./auth-core.js";
import {
	createUserWithEmailAndPassword,
	updateProfile,
	sendEmailVerification,
	GoogleAuthProvider,
	signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFriendlyFirebaseError } from "./firebase-config.js";

const form = document.getElementById("signup-form");
const msg = document.getElementById("auth-msg");
const btn = document.getElementById("submit-btn");
const warn = document.getElementById("config-warn");
const googleBtn = document.getElementById("google-btn");

// Carry a ?next=... target through the whole flow so the user returns to the
// page that sent them here (e.g. the book page) once verified.
const next = new URLSearchParams(location.search).get("next") || "index.html";

function show(text, ok) {
	if (!msg) return;
	msg.textContent = text;
	msg.className = "mt-3 alert " + (ok ? "alert-success" : "alert-danger");
}

// Same rule as StudentGpt: ≥ 8 chars, an uppercase letter, and a special char.
function isStrongPassword(pw) {
	return pw.length >= 8 && /[A-Z]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

// The selected role (Khách/Guest by default), stored per-user in localStorage.
function saveRole(uid) {
	try { localStorage.setItem("role_" + uid, form.role.value); } catch (_) {}
}

if (!configured || !auth) {
	warn?.classList.remove("d-none");
	if (btn) btn.disabled = true;
	if (googleBtn) googleBtn.disabled = true;
} else {
	form?.addEventListener("submit", async (event) => {
		event.preventDefault();
		const name = form.name.value.trim();
		const email = form.email.value.trim();
		const password = form.password.value;

		if (!name || !email) {
			show("Cần họ tên và email hợp lệ.", false);
			return;
		}
		if (!isStrongPassword(password)) {
			show("Mật khẩu cần tối thiểu 8 ký tự, có chữ hoa và ký tự đặc biệt.", false);
			return;
		}

		btn.disabled = true;
		btn.textContent = "Đang tạo tài khoản…";
		try {
			const cred = await createUserWithEmailAndPassword(auth, email, password);
			await updateProfile(cred.user, { displayName: name });
			saveRole(cred.user.uid);
			await sendEmailVerification(cred.user);
			const params = new URLSearchParams({ email: cred.user.email || email, next });
			window.location.href = "verify-email.html?" + params.toString();
		} catch (error) {
			show(getFriendlyFirebaseError(error), false);
			btn.disabled = false;
			btn.textContent = "Tạo tài khoản";
		}
	});

	googleBtn?.addEventListener("click", async () => {
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({ prompt: "select_account" });
		googleBtn.disabled = true;
		try {
			const cred = await signInWithPopup(auth, provider);
			saveRole(cred.user.uid);
			// Google accounts are already verified -> no email step needed.
			window.location.replace(next);
		} catch (error) {
			show(getFriendlyFirebaseError(error), false);
			googleBtn.disabled = false;
		}
	});
}
