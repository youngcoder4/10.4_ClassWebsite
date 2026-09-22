# Quest + Minigame — setup guide

This adds a full flow to the 10.4 site:

**Popup bar → Quest instructions → upload 4 images → admin review → tokens → candy minigame.**

Everything runs on the Firebase project already in `assets/js/firebase-config.js`
(Auth + Realtime Database + Storage). You only need to do the console steps below.

---

## New pages
| Page | What it is |
|------|------------|
| `quest.html` | 4 video steps + token reward table + "I Got it" → "Are you sure" |
| `quest-upload.html` | Uploads exactly 4 images, then the "Thank you… ETA 1 day" screen |
| `prize.html` | Explainer: like/share the class posts → win a prize; button jumps to the quest |
| `admin-review.html` | **Admin hub** — tabs: Review Image (approve/deny) + Prize (claim records) |
| `minigame.html` | Token candy spinner (1 token / spin); win → student/parent claim form |

The popup bar is injected by `assets/js/quest-popup.js` (already on `index.html`).

---

## 1. Firebase Console — Storage
1. Build → **Storage** → enable it (pick the default bucket).
2. **Rules** — signed-in users write their own submission folder; admins can read/delete:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /submissions/{uid}/{file} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid
                   && request.resource.size < 8 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }
  }
}
```
(For deletes to be admin-restricted you'd move that logic to Cloud Functions;
for a class site "any signed-in user can delete" is fine since only admins see the button.)

## 2. Firebase Console — Realtime Database
Build → **Realtime Database** → create (region already `asia-southeast1`). Starter rules:
```
{
  "rules": {
    "users":       { "$uid": { ".read": "auth != null && auth.uid == $uid",
                               ".write": "auth != null && auth.uid == $uid" } },
    "submissions": { ".read": "auth != null", ".write": "auth != null" },
    "inventory":   { ".read": "auth != null", ".write": "auth != null" },
    "wins":        { ".read": "auth != null", ".write": "auth != null" },
    "prizeClaims": { ".read": "auth != null", ".write": "auth != null" }
  }
}
```
> These are permissive (any signed-in user). Good enough for a classroom.
> Tighten later with an `admins` node if you want server-enforced admin-only writes.

## 3. Admin access (hotkey + password)
There is **no admin login menu**. To open the admin hub:
1. Go to the **Sign in** page (`signin.html`).
2. Press **Ctrl + Shift + Alt + A** → a password window appears.
3. Enter the password → you land on `admin-review.html` with two tabs:
   **Review Image** and **Prize**.

Password lives in `assets/js/quest-config.js` → `ADMIN_PASSWORD` (currently `Bmc@172805`).
⚠️ This is client-side, so it only stops casual users — it is not strong security.
The unlock lasts for the browser session. For **approve/deny/delete** to save, you must
also be signed into a normal Firebase account (the database rules require a login);
the admin page shows a blue note if you aren't.

## 4. EmailJS (approve/deny emails)
1. Free account at <https://www.emailjs.com>.
2. Add an **Email Service** (done — `service_75ls014`) and an **Email Template**.
   The template must use these variables: `{{to_email}}`, `{{to_name}}`, `{{subject}}`,
   `{{message}}` (set the template's "To email" field to `{{to_email}}`).
3. Fill the remaining two IDs in `assets/js/quest-config.js` → `EMAILJS`:
   - `serviceId` — ✓ `service_75ls014`
   - `publicKey` — **still needed** (Account → General → Public Key)
   - `templateId` — **still needed** (`template_xxxxxxx` from your template)

Until all three are set the app still works — approve/deny just stores the message
under the user's account (`users/<uid>/notifications`) instead of emailing.

## 5. Quest videos
Put `step1.mp4 … step4.mp4` in `assets/video/` (see the README there).

---

## Prize inventory
Seeded automatically on first minigame load, from `PRIZES` in `quest-config.js`:

| Prize | Stock |
|-------|-------|
| 1 small bag of candy | 10 |
| Medium candy bag | 5 |
| Full candy bag | 5 |
| Mooncake | 3 |

To **restock**, edit `/inventory` values in the Realtime Database console, or delete
the `/inventory` node and reload the minigame to re-seed from the defaults.

When a student wins, the congrats window asks whether they're a **Student**
(ID + name + class) or a **Parent** (kid's name + class). That claim is saved to
`/prizeClaims` and shown in the admin **Prize** tab with the date, name, class,
type (student/parent), prize and the `winId` proof code they screenshot.
Raw wins are also logged under `/wins`.
