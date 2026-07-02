// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project.
// 3. Click the Web icon (</>) to add an app to your project.
// 4. Register the app (you don't need Firebase Hosting).
// 5. Copy the firebaseConfig object they give you and paste it below, replacing the placeholder.
// 6. Go to "Firestore Database" in the left menu and click "Create database" (Start in Test Mode for now).

const firebaseConfig = {
    apiKey: "AIzaSyCgHQh4FyCvLmQwDwwfySZQGD5gEm2yCoY",
    authDomain: "vip-voting-2026.firebaseapp.com",
    projectId: "vip-voting-2026",
    storageBucket: "vip-voting-2026.firebasestorage.app",
    messagingSenderId: "324278826083",
    appId: "1:324278826083:web:7355b3c36ea2ab2f0b7456",
    measurementId: "G-31LGED6ZGM"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
