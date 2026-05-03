import "@/styles/globals.css";
import type { AppProps } from "next/app";

import Navbar from "@/Components/Navbar";
import Fotter from "@/Components/Fotter";
import { store } from "../store/store";
import { Provider, useDispatch } from "react-redux";
import { useEffect } from "react";
import { auth } from "@/firebase/firebase";
import { login, logout } from "@/Feature/Userslice";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from "axios";
import { LanguageProvider, useTranslation } from "@/i18n/LanguageContext";
import FrenchOTPModal from "@/Components/FrenchOTPModal";

function AuthListener() {
  const dispatch = useDispatch();
  useEffect(() => {
    // Check for email/password user in localStorage first
    const storedUser = localStorage.getItem("emailUser");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        dispatch(login(userData));
      } catch (e) {
        localStorage.removeItem("emailUser");
      }
    }

    // Listen for Firebase Google auth state changes
    auth.onAuthStateChanged(async (authuser) => {
      if (authuser) {
        // Only handle Google auth users (email/password users are handled above)
        const providerData = authuser.providerData;
        const isGoogleUser = providerData.some(
          (p) => p.providerId === "google.com"
        );

        if (isGoogleUser) {
          // IMPORTANT: If a Google login is currently in progress (initiated from Navbar),
          // do NOT auto-dispatch login here. The Navbar's handlelogin() will handle it
          // after checking OTP requirements. This prevents bypassing Chrome OTP verification.
          if ((window as any).__GOOGLE_LOGIN_IN_PROGRESS__) {
            return;
          }

          // Also skip auto-login if there's a pending Chrome OTP verification
          // (e.g., user reloaded the page while the OTP modal was showing)
          if (sessionStorage.getItem("pendingChromeOTP")) {
            return;
          }

          dispatch(
            login({
              uid: authuser.uid,
              photo: authuser.photoURL,
              name: authuser.displayName,
              email: authuser.email,
              phoneNumber: authuser.phoneNumber,
              authProvider: "google",
            })
          );
          // Sync Firebase user to MongoDB for friend/post system
          // Note: Device tracking is handled in Navbar.tsx during the explicit login action.
          // This onAuthStateChanged sync uses NO deviceInfo so the backend will skip security checks
          // (preventing OTP loops on page reload).
          try {
            await axios.post(
              "https://internarea-1-n2uz.onrender.com/api/user/sync",
              {
                firebaseUid: authuser.uid,
                name: authuser.displayName,
                email: authuser.email,
                photo: authuser.photoURL,
                phoneNumber: authuser.phoneNumber,
              }
            );
          } catch (err) {
            console.error("User sync error:", err);
          }
        }
      } else {
        // Only logout if there's no email user stored and no pending OTP verification
        const emailUser = localStorage.getItem("emailUser");
        const pendingOTP = sessionStorage.getItem("pendingChromeOTP");
        if (!emailUser && !pendingOTP) {
          dispatch(logout());
        }
      }
    });
  }, [dispatch]);
  return null;
}

function FrenchModalWrapper() {
  const { showFrenchModal, setShowFrenchModal, requestFrench } = useTranslation();
  if (!showFrenchModal) return null;
  return (
    <FrenchOTPModal
      onVerified={requestFrench}
      onCancel={() => setShowFrenchModal(false)}
    />
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <AuthListener />
        <ToastContainer />
        <FrenchModalWrapper />
        <Navbar />
        <Component {...pageProps} />
        <Fotter />
      </LanguageProvider>
    </Provider>
  );
}
