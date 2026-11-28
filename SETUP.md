# Switch on the live chat (about 10 minutes, free)

1. Go to https://console.firebase.google.com and click **Add project** (any name).
2. **Build > Authentication > Get started > Email/Password > Enable.**
   Then **Settings > Authorized domains > Add domain**: `scottcode.fun`.
3. **Build > Firestore Database > Create database** (production mode, any region).
4. Open the **Rules** tab, paste this, and Publish. (Leave OWNER_UID_HERE for now.)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /messages/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 300
        && request.resource.data.name is string
        && request.resource.data.name.size() <= 20
        && request.resource.data.ts == request.time;
      allow delete: if request.auth != null && request.auth.uid == 'OWNER_UID_HERE';
      allow update: if false;
    }
  }
}
```

5. **Project settings (gear) > Your apps > Web (</>)** > register app. Copy the config values
   (apiKey, authDomain, projectId, appId) into `firebase-config.js`.
6. Upload everything to scottcode.fun, open the site, and **sign up first** (you are the owner).
7. Open the chat, click **ID** in the header (it copies your ID). Paste it:
   - in `firebase-config.js` as `OWNER_UID`
   - in the Firestore rules in place of `OWNER_UID_HERE`, then Publish.
8. Now you can type `/del chat` to wipe all messages, and you get a delete button on every message.

Chat history is kept forever until you delete it. The last 300 messages are shown.
