import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "smiling-shift-gwjkk",
  appId: "1:412755205607:web:ae2c54519dd580bf19b142",
  apiKey: "AIzaSyB-y9NfWwhgyweTI3RCpiNN4sFB5mdbrdM",
  authDomain: "smiling-shift-gwjkk.firebaseapp.com",
  storageBucket: "smiling-shift-gwjkk.firebasestorage.app",
  messagingSenderId: "412755205607"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-wificaptiveporta-29a63599-79d7-4673-a822-13d945899ca4");

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (region: string) => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Save user profile with selected region
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      region: region,
      lastLogin: serverTimestamp()
    }, { merge: true });

    // Log the login event
    await addDoc(collection(db, "login_logs"), {
      uid: user.uid,
      region: region,
      timestamp: serverTimestamp()
    });

    return user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};
