import React, { useState } from "react";
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { login } from "@/Feature/Userslice";
import { toast } from "react-toastify";
import axios from "axios";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import ChromeOTPModal from "@/Components/ChromeOTPModal";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

const EmailAuth = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });

  // Chrome OTP state
  const [showChromeOTP, setShowChromeOTP] = useState(false);
  const [chromeOTPData, setChromeOTPData] = useState<{
    email: string;
    loginId: string;
  } | null>(null);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  /** Collect device info from browser */
  const getDeviceInfo = () => ({
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error(t("toast.fillAllFields"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        ...loginData,
        deviceInfo: getDeviceInfo(),
      });
      const data = res.data;

      // Check if Chrome OTP is required
      if (data.requiresOTP) {
        setChromeOTPData({ email: data.email, loginId: data.loginId });
        setShowChromeOTP(true);
        toast.info("OTP sent to your email for Chrome verification.");
        return;
      }

      // Normal login — dispatch to Redux
      dispatch(login(data));
      localStorage.setItem("emailUser", JSON.stringify(data));
      toast.success(t("toast.loginSuccess"));
      router.push("/");
    } catch (error: any) {
      const msg = error?.response?.data?.error || t("toast.loginFailed");
      const reason = error?.response?.data?.blockedReason;

      if (reason === "mobile_time_restriction") {
        toast.error("📱 Mobile login is only allowed between 10:00 AM and 1:00 PM IST");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** Called when Chrome OTP is successfully verified */
  const handleChromeOTPVerified = (userData: any) => {
    setShowChromeOTP(false);
    setChromeOTPData(null);

    // Remove the 'verified' flag before storing
    const { verified, ...cleanUserData } = userData;
    dispatch(login(cleanUserData));
    localStorage.setItem("emailUser", JSON.stringify(cleanUserData));
    toast.success("✅ Chrome verification successful! Welcome back.");
    router.push("/");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !registerData.name ||
      !registerData.email ||
      !registerData.password
    ) {
      toast.error(t("toast.fillRequired"));
      return;
    }

    if (registerData.password.length < 6) {
      toast.error(t("toast.passwordMinLength"));
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error(t("toast.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, {
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        phoneNumber: registerData.phoneNumber,
      });
      const userData = res.data;

      // Dispatch to Redux
      dispatch(login(userData));

      // Save to localStorage for persistence
      localStorage.setItem("emailUser", JSON.stringify(userData));

      toast.success(t("toast.registerSuccess"));
      router.push("/");
    } catch (error: any) {
      const msg = error?.response?.data?.error || t("toast.registerFailed");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chrome OTP Modal */}
      {showChromeOTP && chromeOTPData && (
        <ChromeOTPModal
          email={chromeOTPData.email}
          loginId={chromeOTPData.loginId}
          onVerified={handleChromeOTPVerified}
          onCancel={() => {
            setShowChromeOTP(false);
            setChromeOTPData(null);
          }}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            {t("emailAuth.backToHome")}
          </Link>

          {/* Logo area */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <Mail size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {activeTab === "login" ? t("emailAuth.welcomeBack") : t("emailAuth.createAccount")}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {activeTab === "login"
                ? t("emailAuth.signInTo")
                : t("emailAuth.registerFor")}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "login"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("emailAuth.login")}
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "register"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("emailAuth.register")}
            </button>
          </div>

          {/* Forms */}
          <div className="bg-white py-8 px-6 shadow-lg rounded-2xl border border-gray-100">
            {activeTab === "login" ? (
              <form className="space-y-5" onSubmit={handleLogin}>
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("emailAuth.emailAddress")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      className="block w-full text-gray-800 pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("emailAuth.password")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      className="block w-full text-gray-800 pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow"
                      placeholder={t("emailAuth.passwordPlaceholder")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="flex justify-end">
                  <Link
                    href="/forgotpassword"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t("emailAuth.forgotPassword")}
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("emailAuth.signingIn")}
                    </div>
                  ) : (
                    t("emailAuth.signIn")
                  )}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleRegister}>
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("emailAuth.fullName")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={registerData.name}
                      onChange={handleRegisterChange}
                      className="block w-full text-gray-800 pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                      placeholder={t("emailAuth.namePlaceholder")}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("emailAuth.emailRequired")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={registerData.email}
                      onChange={handleRegisterChange}
                      className="block w-full text-gray-800 pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("emailAuth.phoneNumber")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={registerData.phoneNumber}
                      onChange={handleRegisterChange}
                      className="block w-full text-gray-800 pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                      placeholder={t("emailAuth.phonePlaceholder")}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("emailAuth.passwordRequired")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      className="block w-full text-gray-800 pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                      placeholder={t("emailAuth.passwordMin")}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("emailAuth.confirmPassword")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={registerData.confirmPassword}
                      onChange={handleRegisterChange}
                      className="block w-full text-gray-800 pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                      placeholder={t("emailAuth.confirmPlaceholder")}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("emailAuth.creatingAccount")}
                    </div>
                  ) : (
                    t("emailAuth.createAccount")
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">{t("emailAuth.or")}</span>
              </div>
            </div>

            {/* Google login redirect */}
            <p className="text-center text-sm text-gray-600">
              {t("emailAuth.preferGoogle")}{" "}
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {t("emailAuth.googleOnHome")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailAuth;
