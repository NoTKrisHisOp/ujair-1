# MindBridge – Collaborative Learning Platform

MindBridge is a React + Vite app backed by Firebase (Auth, Firestore, Storage). It enables students to share notes, chat 1:1, create study groups, and discover peers.

## Features
- Email/Google auth
- Profile with avatar and note uploads (PDF/images)
- User search and profiles with follow/unfollow
- Community hub with study groups (create/join/leave, invite by email)
- Realtime chat (direct messages) with conversation threads

## Tech Stack
- React 19, Vite 7, React Router
- Firebase v12 (Auth, Firestore, Storage)
- Tailwind-style utility classes

## Getting Started
1. Clone and install
```bash
git clone https://github.com/NoTKrisHisOp/ujair.git
cd ujair/kidzone/kidzone
npm install
```

2. Configure Firebase
Edit `src/firebase.js` with your project settings (make sure `storageBucket` ends with `.appspot.com`).

3. Run dev server
```bash
npm run dev
```
Visit http://localhost:5173

## Required Firestore Collections
- `users`: created at signup/login
- `notes`: { userId, fileURL, title, type, timestamp }
- `follows`: { followerId, followingId, createdAt }
- `studyGroups`: { name, description, subject, createdBy, createdByName, createdAt, members: [uid], memberCount, isActive }
- `messages`: { text, createdAt, conversationKey, participants: [uidA, uidB], senderId, recipientId, senderDisplayName, senderPhotoURL, status }
- `doubts`: { title, description, subject, authorId, authorName, fileURL, solved, createdAt, replies, views, upvotes }

## Example Firestore Rules (starter)
Adjust to your needs and deploy in Firebase console.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }

    match /users/{userId} {
      allow read: if true;
      allow write: if isSignedIn() && request.auth.uid == userId;
    }

    match /follows/{followId} {
      allow read: if true;
      allow create: if isSignedIn()
        && request.resource.data.followerId == request.auth.uid
        && request.resource.data.followingId is string;
      allow delete: if isSignedIn() && resource.data.followerId == request.auth.uid;
      allow update: if false;
    }

    match /studyGroups/{groupId} {
      allow read: if true;
      allow create: if isSignedIn()
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.members.size() == 1
        && request.resource.data.members[0] == request.auth.uid;
      allow update: if isSignedIn()
        && (request.resource.data.members hasAny [request.auth.uid]
            || resource.data.members hasAny [request.auth.uid]);
      allow delete: if false;
    }

    match /messages/{messageId} {
      allow read: if isSignedIn() && request.auth.uid in resource.data.participants;
      allow create: if isSignedIn()
        && request.resource.data.senderId == request.auth.uid
        && request.auth.uid in request.resource.data.participants
        && request.resource.data.participants.size() == 2
        && request.resource.data.conversationKey is string
        && request.resource.data.text is string;
      allow update, delete: if false;
    }

    match /notes/{noteId} {
      allow read: if true;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow update: if false;
    }

    match /doubts/{doubtId} {
      allow read: if true;
      allow create: if isSignedIn() && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.authorId == request.auth.uid;
    }
  }
}
```

## Environment
- Node 18+
- Configure Firebase project in `src/firebase.js`

## Scripts
- `npm run dev` – start dev server
- `npm run build` – build for production
- `npm run preview` – preview build

## License
MIT

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
