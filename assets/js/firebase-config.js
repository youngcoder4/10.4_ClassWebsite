/* ============================================================
   Firebase config — Lớp 10.4
   ------------------------------------------------------------
   This site uses its OWN Firebase project: project-5891382748614253365.

   STILL NEEDED IN THE CONSOLE for login to work:
   • Build → Authentication → Sign-in method → enable "Email/Password".
   • Authentication → Settings → Authorized domains → make sure your site
     domain is listed (project-5891382748614253365.firebaseapp.com, plus
     "localhost" for local testing — localhost is added by default).

   NOTE: a Firebase WEB apiKey is NOT a secret — it is meant to live in
   client code. Access is controlled by Firebase Auth rules, not by hiding it.
   ============================================================ */

export const firebaseConfig = {
	apiKey: "AIzaSyApv5hvlGVLXsOKm5wrthIOUqT3ewUJb1E",
	authDomain: "project-5891382748614253365.firebaseapp.com",
	databaseURL: "https://project-5891382748614253365-default-rtdb.asia-southeast1.firebasedatabase.app",
	projectId: "project-5891382748614253365",
	storageBucket: "project-5891382748614253365.firebasestorage.app",
	messagingSenderId: "496763245652",
	appId: "1:496763245652:web:67f58cb43de9a03e4cc9c1",
	measurementId: "G-FEPZNNZGKX"
};

// True once the real apiKey has been pasted in (i.e. it no longer starts with "TODO").
export function isConfigured() {
	const key = firebaseConfig.apiKey;
	return !!key && key.indexOf("TODO") !== 0;
}

// Turn a Firebase error into a short Vietnamese message for the user.
export function getFriendlyFirebaseError(error) {
	const code = (error && (error.code || error.message)) || "";

	const map = {
		"auth/email-already-in-use": "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
		"auth/invalid-email": "Email không hợp lệ.",
		"auth/weak-password": "Mật khẩu quá yếu (tối thiểu 8 ký tự, có chữ hoa và ký tự đặc biệt).",
		"auth/operation-not-allowed": "Email/Password chưa được bật trong Firebase Console.",
		"auth/user-disabled": "Tài khoản đã bị vô hiệu hoá.",
		"auth/user-not-found": "Không tìm thấy tài khoản với email này.",
		"auth/wrong-password": "Sai mật khẩu.",
		"auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
		"auth/too-many-requests": "Thử lại quá nhiều lần — hãy đợi một lát.",
		"auth/network-request-failed": "Lỗi mạng — kiểm tra kết nối Internet.",
		"auth/configuration-not-found": "Cấu hình Firebase chưa đúng. Kiểm tra lại apiKey/appId và bật Authentication."
	};

	for (const key in map) {
		if (code.indexOf(key) !== -1) return map[key];
	}
	return "Không thể tiếp tục. Kiểm tra lại cấu hình Firebase và thử lại.";
}
