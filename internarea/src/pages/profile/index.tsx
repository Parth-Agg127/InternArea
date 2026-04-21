import { selectuser } from "@/Feature/Userslice";
import { Crown, Download, ExternalLink, FileText, Mail, Shield, Star, User, Zap } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { useTranslation } from "@/i18n/LanguageContext";

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

const index = () => {
  const user = useSelector(selectuser);
  const { t } = useTranslation();
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      const uid = user.uid || user.firebaseUid || user._id;
      if (!uid) return;

      try {
        const res = await axios.get(
          `https://internarea-1-n2uz.onrender.com/api/user/${uid}/subscription`
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
          `https://internarea-1-n2uz.onrender.com/api/resume/${uid}`
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

  const plan = subInfo?.currentPlan || "Free";
  const style = planStyles[plan] || planStyles.Free;

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
