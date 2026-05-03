import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth, provider } from "../firebase/firebase";
import { ChevronDown, ChevronUp, Globe, Menu, Search, X } from "lucide-react";
import { signInWithPopup, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { login, logout, selectuser } from "@/Feature/Userslice";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation, LANGUAGE_OPTIONS, Locale } from "@/i18n/LanguageContext";
import ChromeOTPModal from "@/Components/ChromeOTPModal";
import axios from "axios";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

interface User {
  name: string;
  email: string;
  photo: string;
}

const Navbar = () => {
  const user = useSelector(selectuser);
  const dispatch = useDispatch();
  const { t, locale, setLocale } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Chrome OTP state
  const [showChromeOTP, setShowChromeOTP] = useState(false);
  const [chromeOTPData, setChromeOTPData] = useState<{
    email: string;
    loginId: string;
  } | null>(null);
  // Hold Google user data while waiting for OTP
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);
  // Loading state while sync call is in progress
  const [syncLoading, setSyncLoading] = useState(false);

  // Restore pending Chrome OTP state from sessionStorage on mount
  // (so the OTP modal survives page reload)
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingChromeOTP");
    if (pending) {
      try {
        const data = JSON.parse(pending);
        setPendingGoogleUser(data.user);
        setChromeOTPData(data.otp);
        setShowChromeOTP(true);
      } catch (e) {
        sessionStorage.removeItem("pendingChromeOTP");
      }
    }
  }, []);

  /** Collect device info from browser */
  const getDeviceInfo = () => ({
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  });

  const handlelogin = async () => {
    // Set flag to prevent AuthListener from auto-dispatching login
    // while we check OTP requirements
    (window as any).__GOOGLE_LOGIN_IN_PROGRESS__ = true;
    setSyncLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const authuser = result.user;

      // Sync to backend with device info
      try {
        const syncRes = await axios.post(`${API_URL}/user/sync`, {
          firebaseUid: authuser.uid,
          name: authuser.displayName,
          email: authuser.email,
          photo: authuser.photoURL,
          phoneNumber: authuser.phoneNumber,
          deviceInfo: getDeviceInfo(),
        });

        const syncData = syncRes.data;

        // Check if Chrome OTP is required
        if (syncData.requiresOTP) {
          // Don't dispatch login yet — wait for OTP
          const userData = {
            uid: authuser.uid,
            photo: authuser.photoURL,
            name: authuser.displayName,
            email: authuser.email,
            phoneNumber: authuser.phoneNumber,
            authProvider: "google",
          };
          const otpData = { email: syncData.email, loginId: syncData.loginId };

          setPendingGoogleUser(userData);
          setChromeOTPData(otpData);
          setShowChromeOTP(true);

          // Persist to sessionStorage so OTP modal survives page reload
          sessionStorage.setItem("pendingChromeOTP", JSON.stringify({
            user: userData,
            otp: otpData,
          }));

          toast.info("OTP sent to your email for Chrome verification.");
          setSyncLoading(false);
          setIsMobileMenuOpen(false);
          return;
        }

        // Normal login (no OTP needed) — clear flag and dispatch
        (window as any).__GOOGLE_LOGIN_IN_PROGRESS__ = false;
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
        toast.success(t("toast.loginSuccess"));
      } catch (syncErr: any) {
        (window as any).__GOOGLE_LOGIN_IN_PROGRESS__ = false;
        // Handle mobile time restriction — explicit security block
        if (syncErr.response?.status === 403 && syncErr.response?.data?.blockedReason === "mobile_time_restriction") {
          toast.error("📱 Mobile login is only allowed between 10:00 AM and 1:00 PM IST");
          // Sign out from Firebase since login is blocked
          await signOut(auth);
          setSyncLoading(false);
          return;
        }

        // For any other backend failure (server down, email service error, etc.),
        // still allow the user to log in as a fallback to avoid getting stuck.
        console.warn("User sync failed, proceeding with login anyway:", syncErr.message);
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
        toast.success(t("toast.loginSuccess"));
      }

      setSyncLoading(false);
      setIsMobileMenuOpen(false);
    } catch (error) {
      (window as any).__GOOGLE_LOGIN_IN_PROGRESS__ = false;
      setSyncLoading(false);
      console.error(error);
      toast.error(t("toast.loginFailed"));
    }
  };

  /** Called when Chrome OTP is successfully verified for Google login */
  const handleChromeOTPVerified = (userData: any) => {
    setShowChromeOTP(false);
    setChromeOTPData(null);

    // Clear the flag and sessionStorage — OTP verified, safe to complete login
    (window as any).__GOOGLE_LOGIN_IN_PROGRESS__ = false;
    sessionStorage.removeItem("pendingChromeOTP");

    // Dispatch the pending Google user data
    if (pendingGoogleUser) {
      dispatch(login(pendingGoogleUser));
      setPendingGoogleUser(null);
    }

    toast.success("✅ Chrome verification successful! Welcome back.");
  };

  const handleChromeOTPCancel = async () => {
    setShowChromeOTP(false);
    setChromeOTPData(null);
    setPendingGoogleUser(null);
    // Clear the flag and sessionStorage — login was cancelled
    (window as any).__GOOGLE_LOGIN_IN_PROGRESS__ = false;
    sessionStorage.removeItem("pendingChromeOTP");
    // Sign out from Firebase since OTP was cancelled
    await signOut(auth);
  };

  const handlelogout = () => {
    signOut(auth);
    localStorage.removeItem("emailUser");
    sessionStorage.removeItem("pendingChromeOTP");
    dispatch(logout());
    setIsMobileMenuOpen(false);
  };

  const handleLanguageChange = (code: Locale) => {
    setLocale(code);
    setIsLangOpen(false);
    if (code !== "fr") {
      toast.success(t("toast.languageChanged"));
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
      if (
        langRef.current &&
        !langRef.current.contains(event.target as Node)
      ) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === locale);

  return (
    <>
      {/* Chrome OTP Modal */}
      {showChromeOTP && chromeOTPData && (
        <ChromeOTPModal
          email={chromeOTPData.email}
          loginId={chromeOTPData.loginId}
          onVerified={handleChromeOTPVerified}
          onCancel={handleChromeOTPCancel}
        />
      )}

      <div className="relative" ref={mobileMenuRef}>
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Logo */}
              <div className="shrink-0">
                <Link href="/" className="text-xl font-bold text-blue-600 cursor-pointer block">
                  <img src={"/logo.png"} alt="InternArea Logo" className="h-16" />
                </Link>
              </div>

              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center space-x-8">
                <Link
                  href="/internship"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  {t("navbar.internships")}
                </Link>
                <Link
                  href="/job"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  {t("navbar.jobs")}
                </Link>
                <Link
                  href="/publicspace"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  {t("navbar.publicSpace")}
                </Link>
                <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                  <Search className="text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder={t("navbar.searchPlaceholder")}
                    className="ml-2 bg-transparent focus:outline-none text-sm w-48"
                  />
                </div>
              </div>

              {/* Desktop Auth Buttons + Language + Mobile Hamburger */}
              <div className="flex items-center space-x-3">
                {/* Language Switcher — Desktop */}
                <div className="relative hidden md:block" ref={langRef}>
                  <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                    aria-label="Switch language"
                  >
                    <Globe size={16} />
                    <span>{currentLang?.flag}</span>
                    {isLangOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isLangOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {t("language.switchLanguage")}
                      </div>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                            locale === lang.code
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span>{lang.label}</span>
                          {locale === lang.code && (
                            <span className="ml-auto text-blue-600 text-xs">✓</span>
                          )}
                          {lang.code === "fr" && locale !== "fr" && (
                            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                              OTP
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop auth — hidden on mobile */}
                <div className="hidden md:flex items-center space-x-4">
                  {user ? (
                    <div className="flex items-center space-x-2">
                      <Link href="/profile">
                        {user.photo ? (
                          <img
                            src={user.photo}
                            alt={user.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {user.name?.charAt(0) || "U"}
                            </span>
                          </div>
                        )}
                      </Link>
                      <button
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        onClick={handlelogout}
                      >
                        {t("navbar.logout")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handlelogin}
                        disabled={syncLoading}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-wait"
                      >
                        {syncLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-500">Verifying...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                            <span className="text-gray-700">
                              {t("navbar.googleLogin")}
                            </span>
                          </>
                        )}
                      </button>
                      <Link
                        href="/emailauth"
                        className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        {t("navbar.emailLogin")}
                      </Link>
                      <a
                        href="/adminlogin"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        {t("navbar.admin")}
                      </a>
                    </>
                  )}
                </div>

                {/* Mobile: show profile pic if logged in */}
                {user && (
                  <Link href="/profile" className="md:hidden">
                    {user.photo ? (
                      <img
                        src={user.photo}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {user.name?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                  </Link>
                )}

                {/* Mobile Hamburger Button */}
                <button
                  className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle mobile menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Drawer */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              isMobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-4 pt-2 pb-4 space-y-3 border-t border-gray-200 bg-white">
              {/* Mobile Search */}
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                <Search className="text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder={t("navbar.searchPlaceholder")}
                  className="ml-2 bg-transparent focus:outline-none text-sm w-full"
                />
              </div>

              {/* Mobile Nav Links */}
              <Link
                href="/internship"
                className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("navbar.internships")}
              </Link>
              <Link
                href="/job"
                className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("navbar.jobs")}
              </Link>
              <Link
                href="/publicspace"
                className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("navbar.publicSpace")}
              </Link>

              {user && (
                <Link
                  href="/userapplication"
                  className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t("navbar.myApplications")}
                </Link>
              )}

              {/* Mobile Language Switcher */}
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  <Globe size={12} className="inline mr-1" />
                  {t("language.switchLanguage")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        handleLanguageChange(lang.code);
                        if (lang.code !== "fr") setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        locale === lang.code
                          ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="text-xs">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200" />

              {/* Mobile Auth */}
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 px-4 py-2">
                    {user.photo ? (
                      <img
                        src={user.photo}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold">
                          {user.name?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                    onClick={handlelogout}
                  >
                    {t("navbar.logout")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handlelogin}
                    disabled={syncLoading}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    {syncLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500">Verifying...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span className="text-gray-700">{t("navbar.googleLogin")}</span>
                      </>
                    )}
                  </button>
                  <Link
                    href="/emailauth"
                    className="block text-center px-4 py-3 text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t("navbar.emailLogin")}
                  </Link>
                  <a
                    href="/adminlogin"
                    className="block text-center px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-800 rounded-lg font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t("navbar.adminLogin")}
                  </a>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Navbar;
