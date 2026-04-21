import React, { useState } from "react";
import { X, Mail, Shield, Loader2, CheckCircle } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

interface FrenchOTPModalProps {
  onVerified: () => void;
  onCancel: () => void;
}

const FrenchOTPModal: React.FC<FrenchOTPModalProps> = ({ onVerified, onCancel }) => {
  const { t } = useTranslation();
  const user = useSelector(selectuser);

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState(user?.email || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setMessage(t("toast.enterEmail"));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await axios.post(`${API_URL}/resume/send-otp`, {
        email,
        purpose: "french_language",
      });
      setStep("otp");
      setMessage(t("language.otpSent"));
    } catch (err: any) {
      setMessage(err.response?.data?.error || t("toast.otpSendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setMessage(t("toast.enterOTP"));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await axios.post(`${API_URL}/resume/verify-otp`, {
        email,
        otp,
        purpose: "french_language",
      });
      onVerified();
    } catch (err: any) {
      setMessage(err.response?.data?.error || t("toast.otpFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">🇫🇷</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {t("language.frenchVerification")}
                </h3>
                <p className="text-white/70 text-sm">
                  {t("language.frenchVerificationDesc")}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {step === "email" ? (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <span className="font-medium text-gray-700">
                  {t("language.enterEmail")}
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("language.enterEmail")}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm transition-shadow"
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                />
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t("language.sendingOTP")}
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    {t("resume.sendOTP")}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <CheckCircle size={14} />
                </div>
                <span className="text-green-600 font-medium text-xs">
                  {t("language.otpSent")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <span className="font-medium text-gray-700">
                  {t("language.enterOTP")}
                </span>
              </div>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                maxLength={6}
                className="block w-full text-center tracking-[0.5em] text-2xl font-mono py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 transition-shadow"
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
              />

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t("language.verifying")}
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {t("language.verifyAndSwitch")}
                  </>
                )}
              </button>

              {/* Resend link */}
              <button
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setMessage("");
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← {t("common.back")}
              </button>
            </>
          )}

          {/* Message */}
          {message && (
            <p
              className={`text-sm text-center font-medium px-3 py-2 rounded-lg ${
                message.includes("✅") || message.includes("sent") || message.includes("envoyé") || message.includes("भेजा")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            {t("language.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FrenchOTPModal;
