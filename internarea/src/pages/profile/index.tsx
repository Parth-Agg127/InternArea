import { selectuser } from "@/Feature/Userslice";
import { Crown, ExternalLink, Mail, Shield, Star, User, Zap } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";

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
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);

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
      } catch (err) {
        console.error("Failed to fetch subscription info:", err);
      } finally {
        setSubLoading(false);
      }
    };
    fetchSubscription();
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
                      <h3 className="text-white font-bold text-lg">{plan} Plan</h3>
                      <p className="text-white/80 text-sm">Current Subscription</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white`}>
                    {plan === "Free" ? "FREE" : "ACTIVE"}
                  </span>
                </div>

                <div className="px-6 py-5 bg-white">
                  {subLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                      <span className="ml-3 text-gray-500 text-sm">Loading subscription info...</span>
                    </div>
                  ) : subInfo ? (
                    <div className="space-y-4">
                      {/* Usage Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 font-medium">Applications Used This Month</span>
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
                          <span className="text-gray-600">Plan Expires</span>
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
                            Upgrade Your Plan
                          </>
                        ) : (
                          <>
                            Manage Subscription
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Link>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-2 text-sm">Could not load subscription info</p>
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
                    Active Applications
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="text-green-600 font-semibold text-2xl">
                    0
                  </span>
                  <p className="text-green-600 text-sm mt-1">
                    Accepted Applications
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center pt-4">
                <Link
                  href="/userapplication"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  View Applications
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
