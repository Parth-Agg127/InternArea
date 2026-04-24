import { selectuser } from "@/Feature/Userslice";
import { Crown, Download, ExternalLink, FileText, Mail, Shield, Star, User, Zap, Monitor, Smartphone, Tablet, Clock, MapPin, Globe } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { useTranslation } from "@/i18n/LanguageContext";

const API_URL = "https://internarea-1-n2uz.onrender.com/api";

interface UserType {
  name: string;
  email: string;
  photo: string;
  uid?: string;
  _id?: string;
  firebaseUid?: string;
}

interface SubscriptionInfo {
  currentPlan: string;
  applicationsUsedThisMonth: number;
  planExpiryDate: string | null;
  maxApplications: number;
}

interface ResumeInfo {
  hasResume: boolean;
  resumeUrl: string;
}

interface LoginRecord {
  _id: string;
  browser: string;
  browserVersion: string;
  os: string;
  deviceType: string;
  ipAddress: string;
  loginMethod: string;
  status: string;
  chromeOtpRequired: boolean;
  blockedReason: string;
  timestamp: string;
}

const planStyles: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; gradient: string }> = {
  Free: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    icon: <Shield className="h-5 w-5 text-gray-500" />,
    gradient: "from-gray-400 to-gray-500",
  },
  Bronze: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
    icon: <Star className="h-5 w-5 text-amber-600" />,
    gradient: "from-amber-500 to-amber-600",
  },
  Silver: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-400",
    icon: <Zap className="h-5 w-5 text-slate-500" />,
    gradient: "from-slate-400 to-slate-600",
  },
  Gold: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-400",
    icon: <Crown className="h-5 w-5 text-yellow-600" />,
    gradient: "from-yellow-400 to-yellow-600",
  },
};

/** Get browser icon/emoji */
function getBrowserIcon(browser: string) {
  switch (browser.toLowerCase()) {
    case "chrome": return "🌐";
    case "firefox": return "🦊";
    case "safari": return "🧭";
    case "edge": return "🔷";
    case "opera": return "🔴";
    default: return "🌍";
  }
}

/** Get status badge */
function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">✅ Success</span>;
    case "pending_otp":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">⏳ Pending OTP</span>;
    case "failed":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">❌ Failed</span>;
    case "blocked_time":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">🚫 Blocked</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{status}</span>;
  }
}

/** Get device icon */
function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case "mobile": return <Smartphone className="h-4 w-4 text-purple-500" />;
    case "tablet": return <Tablet className="h-4 w-4 text-indigo-500" />;
    default: return <Monitor className="h-4 w-4 text-blue-500" />;
  }
}

/** Mask IP address for privacy */
function maskIP(ip: string) {
  if (!ip || ip === "unknown") return "—";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  // IPv6 or other — show first portion
  return ip.length > 12 ? ip.substring(0, 12) + "…" : ip;
}

/** Format timestamp */
function formatTimestamp(ts: string) {
  const date = new Date(ts);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const index = () => {
  const user = useSelector(selectuser);
  const { t } = useTranslation();
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [loginLoading, setLoginLoading] = useState(true);
  const [showAllLogins, setShowAllLogins] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      const uid = user.uid || user.firebaseUid || user._id;
      if (!uid) return;

      try {
        const res = await axios.get(
          `${API_URL}/user/${uid}/subscription`
        );
        setSubInfo(res.data);
      } catch (err: any) {
        // Silently handle — fails when Render server is sleeping or in local dev
        console.warn("Subscription fetch failed (non-fatal):", err.response?.status || err.message);
      } finally {
        setSubLoading(false);
      }
    };
    fetchSubscription();
  }, [user]);

  useEffect(() => {
    const fetchResume = async () => {
      if (!user) return;
      const uid = user.uid || user.firebaseUid || user._id;
      if (!uid) return;

      try {
        const res = await axios.get(
          `${API_URL}/resume/${uid}`
        );
        setResumeInfo(res.data);
      } catch (err: any) {
        // 404 is expected when user has no resume — set fallback state
        if (err.response?.status === 404) {
          setResumeInfo({ hasResume: false, resumeUrl: "" });
        } else {
          console.warn("Resume fetch failed (non-fatal):", err.response?.status || err.message);
        }
      } finally {
        setResumeLoading(false);
      }
    };
    fetchResume();
  }, [user]);

  // Fetch login history
  useEffect(() => {
    const fetchLoginHistory = async () => {
      if (!user) return;
      const uid = user.uid || user.firebaseUid || user._id;
      if (!uid) return;

      try {
        const res = await axios.get(
          `${API_URL}/user/${uid}/login-history`
        );
        setLoginHistory(res.data);
      } catch (err: any) {
        console.warn("Login history fetch failed (non-fatal):", err.response?.status || err.message);
      } finally {
        setLoginLoading(false);
      }
    };
    fetchLoginHistory();
  }, [user]);

  const plan = subInfo?.currentPlan || "Free";
  const style = planStyles[plan] || planStyles.Free;

  // Show 5 login records by default, all if expanded
  const displayedLogins = showAllLogins ? loginHistory : loginHistory.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              {user?.photo ? (
                <img
                  src={user?.photo}
                  alt={user?.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-16 pb-8 px-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <div className="mt-2 flex items-center justify-center text-gray-500">
                <Mail className="h-4 w-4 mr-2" />
                <span>{user?.email}</span>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
              {/* Subscription Status Card */}
              <div className={`rounded-xl border-2 ${style.border} overflow-hidden`}>
                <div className={`bg-gradient-to-r ${style.gradient} px-6 py-4 flex items-center justify-between`}>
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 rounded-lg p-2">
                      {style.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{plan} {t("profile.plan")}</h3>
                      <p className="text-white/80 text-sm">{t("profile.currentSubscription")}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white`}>
                    {plan === "Free" ? t("profile.free") : t("profile.active")}
                  </span>
                </div>

                <div className="px-6 py-5 bg-white">
                  {subLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                      <span className="ml-3 text-gray-500 text-sm">{t("common.loading")}</span>
                    </div>
                  ) : subInfo ? (
                    <div className="space-y-4">
                      {/* Usage Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 font-medium">{t("profile.applicationsUsed")}</span>
                          <span className="font-bold text-gray-900">
                            {subInfo.applicationsUsedThisMonth} / {subInfo.maxApplications === Infinity ? "∞" : subInfo.maxApplications}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              subInfo.maxApplications !== null && subInfo.maxApplications !== Infinity && subInfo.applicationsUsedThisMonth >= subInfo.maxApplications
                                ? "bg-red-500"
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: subInfo.maxApplications === Infinity
                                ? "5%"
                                : `${Math.min(100, (subInfo.applicationsUsedThisMonth / subInfo.maxApplications) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Expiry Date */}
                      {subInfo.planExpiryDate && plan !== "Free" && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{t("profile.planExpires")}</span>
                          <span className="font-medium text-gray-900">
                            {new Date(subInfo.planExpiryDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}

                      {/* Upgrade Button */}
                      <Link
                        href="/subscription"
                        className={`w-full inline-flex items-center justify-center px-6 py-3 font-bold rounded-lg transition-all duration-200 ${
                          plan === "Free"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {plan === "Free" ? (
                          <>
                            <Crown className="h-4 w-4 mr-2" />
                            {t("profile.upgradePlan")}
                          </>
                        ) : (
                          <>
                            {t("profile.manageSubscription")}
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Link>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-2 text-sm">{t("profile.couldNotLoadSubscription")}</p>
                  )}
                </div>
              </div>

              {/* Resume Card */}
              <div className="rounded-xl border-2 border-purple-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 rounded-lg p-2">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{t("profile.professionalResume")}</h3>
                      <p className="text-white/80 text-sm">{t("profile.autoAttached")}</p>
                    </div>
                  </div>
                  {resumeInfo?.hasResume && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                      ✅ {t("profile.resumeReady").toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="px-6 py-5 bg-white">
                  {resumeLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                      <span className="ml-3 text-gray-500 text-sm">{t("profile.loadingResume")}</span>
                    </div>
                  ) : resumeInfo?.hasResume && resumeInfo.resumeUrl ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">{t("profile.resumeAttached")}</p>
                            <p className="text-green-600 text-sm">{t("profile.autoAttached")}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <a
                          href={resumeInfo.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t("profile.downloadResume")}
                        </a>
                        <Link
                          href="/resume-builder"
                          className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {t("profile.createNewResume")}
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-4">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-100 text-purple-600">
                        <FileText className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{t("profile.noResumeYet")}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          {t("profile.noResumeDesc")}
                        </p>
                      </div>
                      <Link
                        href="/resume-builder"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {t("profile.createYourResume")}
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* ====== LOGIN HISTORY CARD ====== */}
              <div className="rounded-xl border-2 border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 rounded-lg p-2">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Login History</h3>
                      <p className="text-white/70 text-sm">Security & Access Activity</p>
                    </div>
                  </div>
                  {loginHistory.length > 0 && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                      {loginHistory.length} Records
                    </span>
                  )}
                </div>

                <div className="px-6 py-5 bg-white">
                  {loginLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-500"></div>
                      <span className="ml-3 text-gray-500 text-sm">Loading login history...</span>
                    </div>
                  ) : loginHistory.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-slate-100 text-slate-400 mb-3">
                        <Clock className="h-7 w-7" />
                      </div>
                      <p className="font-medium text-gray-900">No login history yet</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Your login activity will appear here after your next login.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedLogins.map((record) => (
                        <div
                          key={record._id}
                          className={`rounded-lg border p-4 transition-all hover:shadow-sm ${
                            record.status === "success"
                              ? "border-green-200 bg-green-50/50"
                              : record.status === "pending_otp"
                              ? "border-yellow-200 bg-yellow-50/50"
                              : "border-red-200 bg-red-50/50"
                          }`}
                        >
                          {/* Top row: date + status */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formatTimestamp(record.timestamp)}</span>
                            </div>
                            {getStatusBadge(record.status)}
                          </div>

                          {/* Details row */}
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {/* Browser */}
                            <div className="flex items-center gap-1.5">
                              <span>{getBrowserIcon(record.browser)}</span>
                              <span className="text-gray-700 font-medium">{record.browser}</span>
                              {record.chromeOtpRequired && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">OTP</span>
                              )}
                            </div>

                            <span className="text-gray-300">·</span>

                            {/* OS */}
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-gray-600">{record.os}</span>
                            </div>

                            <span className="text-gray-300">·</span>

                            {/* Device */}
                            <div className="flex items-center gap-1.5">
                              {getDeviceIcon(record.deviceType)}
                              <span className="text-gray-600 capitalize">{record.deviceType}</span>
                            </div>

                            <span className="text-gray-300">·</span>

                            {/* IP */}
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-gray-500 font-mono text-xs">{maskIP(record.ipAddress)}</span>
                            </div>
                          </div>

                          {/* Login method badge */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              record.loginMethod === "google"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-indigo-100 text-indigo-700"
                            }`}>
                              {record.loginMethod === "google" ? "Google" : "Email"} Login
                            </span>
                            {record.blockedReason && (
                              <span className="text-xs text-red-600 font-medium">
                                {record.blockedReason}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Show more / Show less button */}
                      {loginHistory.length > 5 && (
                        <button
                          onClick={() => setShowAllLogins(!showAllLogins)}
                          className="w-full py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          {showAllLogins
                            ? `Show Less`
                            : `View All ${loginHistory.length} Login Records`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <span className="text-blue-600 font-semibold text-2xl">
                    {subInfo?.applicationsUsedThisMonth ?? 0}
                  </span>
                  <p className="text-blue-600 text-sm mt-1">
                    {t("profile.activeApplications")}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="text-green-600 font-semibold text-2xl">
                    0
                  </span>
                  <p className="text-green-600 text-sm mt-1">
                    {t("profile.acceptedApplications")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center pt-4">
                <Link
                  href="/userapplication"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {t("profile.viewApplications")}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
