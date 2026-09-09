/* ============================================================
   Firebase config — Lớp 10.4
   ------------------------------------------------------------
   HOW TO FILL THIS IN (2 minutes):
   1. Open  https://console.firebase.google.com  and pick your project.
   2. Click the gear ⚙  →  "Project settings".
   3. Scroll to "Your apps". If there is no Web app yet, click the
      </>  ("Web") icon and register one (any nickname).
   4. Under "SDK setup and configuration" choose "Config".
   5. Copy the values into the fields marked  TODO  below.

   NOTE: the apiKey for a Firebase WEB app is NOT a secret — it is
   meant to live in client code. Access is controlled by Firebase
   Auth rules, not by hiding this key.

   Also: in the console go to  Build → Authentication → Get started
   → Sign-in method, and ENABLE "Email/Password".
   ============================================================ */

window.firebaseConfig = {
	apiKey: "TODO_PASTE_WEB_API_KEY",                                   // <-- REQUIRED (starts with "AIza...")
	authDomain: "project-5891382748614253365.firebaseapp.com",          // derived from your project id
	projectId: "project-5891382748614253365",                           // your project id
	storageBucket: "project-5891382748614253365.appspot.com",           // check console; may end in .firebasestorage.app
	messagingSenderId: "TODO_PASTE_SENDER_ID",                          // optional, from the same config screen
	appId: "TODO_PASTE_APP_ID"                                          // <-- REQUIRED (looks like "1:...:web:...")
};
