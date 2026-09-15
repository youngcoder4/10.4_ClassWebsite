// The "check your inbox" screen shown right after sign-up.
// Lets the user resend the verification email and continue once they've verified.
import { auth, configured } from "./auth-core.js";
import { sendEmailVerification, reload } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const params = new URLSearchParams(location.search);
const email = params.get("email") || "email của bạn";
const next = params.get("next") || "index.html";

const emailEl = document.getElementById("verificationEmail");
const statusEl = document.getElementById("verifyStatus");
const resendBtn = document.getElementById("resendBtn");
const continueBtn = document.getElementById("continueBtn");
const loginLink = document.getElementById("loginLink");

if (emailEl) emailEl.textContent = email;
// Point the fallback "go to login" link at the same next-target.
if (loginLink) loginLink.href = "signin.html?next=" + encodeURIComponent(next);

function status(text, kind) {
	if (!statusEl) return;
	statusEl.textContent = text;
	statusEl.className = "mt-3 alert alert-" + (kind || "secondary");
}

resendBtn?.addEventListener("click", async () => {
	if (!configured || !auth || !auth.currentUser) {
		status("Không gửi lại được. Hãy đăng nhập lại rồi thử.", "warning");
		return;
	}
	try {
		await sendEmailVerification(auth.currentUser);
		status("Đã gửi lại email xác minh tới " + email + ".", "success");
	} catch (_) {
		status("Gửi lại thất bại — thử lại sau ít phút.", "danger");
	}
});

continueBtn?.addEventListener("click", async () => {
	if (!configured || !auth || !auth.currentUser) {
		window.location.href = "signin.html?next=" + encodeURIComponent(next);
		return;
	}
	try {
		await reload(auth.currentUser);
		if (auth.currentUser.emailVerified) {
			status("Đã xác minh! Đang chuyển tiếp…", "success");
			setTimeout(() => window.location.replace(next), 800);
		} else {
			status("Chưa thấy xác minh. Hãy mở liên kết trong email rồi bấm lại.", "warning");
		}
	} catch (_) {
		status("Có lỗi khi kiểm tra. Thử lại.", "danger");
	}
});
