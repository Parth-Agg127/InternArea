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

function AuthListener() {
  const dispatch = useDispatch();
  useEffect(() => {
    auth.onAuthStateChanged(async (authuser) => {
      if (authuser) {
        dispatch(
          login({
            uid: authuser.uid,
            photo: authuser.photoURL,
            name: authuser.displayName,
            email: authuser.email,
            phoneNumber: authuser.phoneNumber,
          })
        );
        // Sync Firebase user to MongoDB for friend/post system
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
      } else {
        dispatch(logout());
      }
    });
  }, [dispatch]);
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <AuthListener />
      <ToastContainer />
      <Navbar />
      <Component {...pageProps} />
      <Fotter />
    </Provider>
  );
}

