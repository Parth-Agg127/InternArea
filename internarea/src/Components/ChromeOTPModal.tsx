import React, { useState } from "react";
import { X, Shield, Loader2, CheckCircle, Chrome } from "lucide-react";
import axios from "axios";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

interface ChromeOTPModalProps {
  email: string;
  loginId: string;
  onVerified: (userData: any) => void;
  onCancel: () => void;
}

const ChromeOTPModal: React.FC<ChromeOTPModalProps> = ({
  email,
  loginId,
  onVerified,
  onCancel,
}) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 6) {
      setMessage("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post(`${API_URL}/auth/verify-login-otp`, {
        email,
        otp,
        loginId,
      });
      // On success, pass user data back
      onVerified(res.data);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "OTP verification failed. Please try again.");
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
        {/* Header gradient — security-themed blue */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Chrome Security Verification
                </h3>
                <p className="text-white/70 text-sm">
                  OTP sent to your registered email
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
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="shrink-0 mt-0.5">
              <Chrome className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Chrome browser detected
              </p>
              <p className="text-xs text-blue-600 mt-1">
                For enhanced security, please verify your identity with the OTP sent to{" "}
                <strong>{email}</strong>
              </p>
            </div>
          </div>

          {/* OTP Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit verification code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="• • • • • •"
              maxLength={6}
              className="block w-full text-center tracking-[0.5em] text-2xl font-mono py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 transition-shadow"
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
              autoFocus
            />
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerifyOTP}
            disabled={loading || otp.length < 6}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Verify & Login
              </>
            )}
          </button>

          {/* Message */}
          {message && (
            <p
              className={`text-sm text-center font-medium px-3 py-2 rounded-lg ${
                message.includes("success") || message.includes("verified")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          {/* Timer hint */}
          <p className="text-xs text-center text-gray-400">
            OTP expires in 5 minutes. Check your inbox and spam folder.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Cancel Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChromeOTPModal;
