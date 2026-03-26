import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuf6ANLIT7BDt9mVDak2pnFdCt_iuri4M",
  authDomain: "myfitness-55c50.firebaseapp.com",
  projectId: "myfitness-55c50",
  storageBucket: "myfitness-55c50.firebasestorage.app",
  messagingSenderId: "1004981515332",
  appId: "1:1004981515332:web:f42bd095cfb7dffe357811"
};

// App principale (PT)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// App secondaria solo per creare utenti clienti senza sloggarsi
const secondaryApp = initializeApp(firebaseConfig, "secondary");
export const authSecondary = getAuth(secondaryApp);
