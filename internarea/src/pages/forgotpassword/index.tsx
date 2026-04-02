import React, { useState } from "react";
import {
  KeyRound,
  Mail,
  Phone,
  ArrowLeft,
  Loader2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import Link from "next/link";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

type ResetState = "form" | "loading" | "success" | "error";

interface ResetResult {
  newPassword: string;
  userName: string;
}

interface ResetError {
  message: string;
  type: "not_found" | "daily_limit" | "google_user" | "generic";
}

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState("");
  const [state, setState] = useState<ResetState>("form");
  const [result, setResult] = useState<ResetResult | null>(null);
  const [error, setError] = useState<ResetError | null>(null);
  const [copied, setCopied] = useState(false);

  const isEmail = identifier.includes("@");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast.error("Please enter your email or phone number");
      return;
    }

    setState("loading");
    setError(null);
    setResult(null);

    try {
      const res = await axios.post(`${API_URL}/password-reset/reset`, {
        identifier: identifier.trim(),
      });

      setResult({
        newPassword: res.data.newPassword,
        userName: res.data.userName,
      });
      setState("success");
    } catch (err: any) {
      const data = err?.response?.data;
      const status = err?.response?.status;

      let errorType: ResetError["type"] = "generic";
      if (status === 404) errorType = "not_found";
      else if (status === 429 || data?.dailyLimitReached) errorType = "daily_limit";
      else if (data?.isGoogleUser) errorType = "google_user";

      setError({
        message: data?.error || "Something went wrong. Please try again.",
        type: errorType,
      });
      setState("error");
    }
  };

  const handleCopy = async () => {
    if (result?.newPassword) {
      await navigator.clipboard.writeText(result.newPassword);
      setCopied(true);
      toast.success("Password copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleReset = () => {
    setState("form");
    setIdentifier("");
    setResult(null);
    setError(null);
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back button */}
        <Link
          href="/emailauth"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
            <KeyRound size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Forgot Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your registered email or phone number to reset your password
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-2xl border border-gray-100">
          {/* FORM STATE */}
          {state === "form" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isEmail ? (
                      <Mail className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Phone className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full text-gray-800 pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow"
                    placeholder="email@example.com or phone number"
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  We&apos;ll look up your account and generate a new password
                </p>
              </div>

              {/* Info box */}
              <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  This feature is available only for email/password accounts.
                  You can reset your password once per day. A new password with
                  only letters (uppercase and lowercase) will be generated for
                  you.
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Reset Password
              </button>
            </form>
          )}

          {/* LOADING STATE */}
          {state === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600 font-medium">
                Generating your new password...
              </p>
              <p className="text-gray-400 text-sm mt-1">
                This may take a moment
              </p>
            </div>
          )}

          {/* SUCCESS STATE */}
          {state === "success" && result && (
            <div className="space-y-5">
              {/* Success header */}
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Password Reset Successful!
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Hi {result.userName}, your new password is ready
                </p>
              </div>

              {/* Password display */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium text-center">
                  YOUR NEW PASSWORD
                </p>
                <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
                  <code className="text-xl font-mono font-bold text-gray-900 tracking-widest select-all">
                    {result.newPassword}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`ml-3 p-2 rounded-lg transition-colors ${
                      copied
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title="Copy password"
                  >
                    {copied ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Warning */}
              <div className="flex gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <AlertTriangle
                  size={16}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <p className="text-xs text-amber-700">
                  Please save this password securely. You can use it to log in
                  to your account. You can only reset your password once per day.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Link
                  href="/emailauth"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Go to Login
                </Link>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Reset Another Account
                </button>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {state === "error" && error && (
            <div className="space-y-5">
              {/* Error display */}
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    error.type === "daily_limit"
                      ? "bg-amber-100"
                      : error.type === "google_user"
                      ? "bg-blue-100"
                      : "bg-red-100"
                  }`}
                >
                  {error.type === "daily_limit" ? (
                    <AlertTriangle size={28} className="text-amber-600" />
                  ) : error.type === "google_user" ? (
                    <ShieldAlert size={28} className="text-blue-600" />
                  ) : (
                    <ShieldAlert size={28} className="text-red-600" />
                  )}
                </div>

                <h3
                  className={`text-lg font-bold ${
                    error.type === "daily_limit"
                      ? "text-amber-800"
                      : error.type === "google_user"
                      ? "text-blue-800"
                      : "text-red-800"
                  }`}
                >
                  {error.type === "daily_limit"
                    ? "Daily Limit Reached"
                    : error.type === "google_user"
                    ? "Google Account Detected"
                    : "Reset Failed"}
                </h3>
              </div>

              {/* Error message box */}
              <div
                className={`p-4 rounded-xl border text-center ${
                  error.type === "daily_limit"
                    ? "bg-amber-50 border-amber-200"
                    : error.type === "google_user"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    error.type === "daily_limit"
                      ? "text-amber-700"
                      : error.type === "google_user"
                      ? "text-blue-700"
                      : "text-red-700"
                  }`}
                >
                  {error.message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReset}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href="/emailauth"
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Login
                </Link>
                {error.type === "google_user" && (
                  <Link
                    href="/"
                    className="w-full flex justify-center py-2.5 px-4 bg-white border-2 border-blue-200 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Sign in with Google Instead
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
