import Head from "next/head";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { toast } from "react-toastify";
import { Check, Crown, Shield, Star, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

// Function to inject Razorpay script dynamically
const loadScript = (src: string) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const plans = [
  {
    name: "Free",
    price: "₹0",
    priceSubtext: "forever",
    features: [
      "1 Application/month (Internships + Jobs)",
      "Basic Support",
    ],
    buttonText: "Current Plan",
    disabled: true,
    icon: <Shield className="h-8 w-8" />,
    gradient: "from-gray-400 to-gray-500",
    ring: "ring-gray-300",
  },
  {
    name: "Bronze",
    price: "₹100",
    priceSubtext: "/month",
    features: [
      "3 Applications/month (Internships + Jobs)",
      "Email Support",
      "Resume Template",
    ],
    buttonText: "Upgrade to Bronze",
    disabled: false,
    planId: "Bronze",
    icon: <Star className="h-8 w-8" />,
    gradient: "from-amber-500 to-amber-600",
    ring: "ring-amber-300",
  },
  {
    name: "Silver",
    price: "₹300",
    priceSubtext: "/month",
    features: [
      "5 Applications/month (Internships + Jobs)",
      "Priority Email Support",
      "Resume Feedback",
    ],
    buttonText: "Upgrade to Silver",
    disabled: false,
    planId: "Silver",
    icon: <Zap className="h-8 w-8" />,
    gradient: "from-slate-400 to-slate-600",
    ring: "ring-slate-400",
  },
  {
    name: "Gold",
    price: "₹1000",
    priceSubtext: "/month",
    features: [
      "Unlimited Applications (Internships + Jobs)",
      "1-on-1 Mentorship",
      "Direct Referrals",
      "Priority Listing",
    ],
    buttonText: "Upgrade to Gold",
    disabled: false,
    planId: "Gold",
    icon: <Crown className="h-8 w-8" />,
    gradient: "from-yellow-400 to-yellow-600",
    ring: "ring-yellow-400",
    popular: true,
  },
];

export default function Subscription() {
  const user = useSelector(selectuser);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("Free");
  const { t } = useTranslation();

  // Fetch the user's current plan
  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) return;
      const uid = user.uid || user.firebaseUid || user._id;
      if (!uid) return;
      try {
        const res = await axios.get(
          `https://internarea-1-n2uz.onrender.com/api/user/${uid}/subscription`
        );
        setCurrentPlan(res.data.currentPlan || "Free");
      } catch (err) {
        console.error("Failed to fetch plan:", err);
      }
    };
    fetchPlan();
  }, [user]);

  const displayRazorpay = async (plan: any) => {
    if (!user) {
      toast.error("Please login to upgrade your plan!");
      return;
    }

    setLoading(true);
    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

    if (!res) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      setLoading(false);
      return;
    }

    try {
      // Production URL for Vercel / Render deployment
      const API_URL = "https://internarea-1-n2uz.onrender.com/api/payment/checkout"; 
      
      const userId = user._id || user.uid;
      console.log("[Payment Debug] User object:", JSON.stringify(user));
      console.log("[Payment Debug] userId being sent:", userId);
      console.log("[Payment Debug] plan being sent:", plan.planId);

      const { data } = await axios.post(API_URL, {
        userId,
        plan: plan.planId,
      }, { timeout: 60000 }); // 60s timeout for Render cold start

      console.log("[Payment Debug] Order created successfully:", data);

      if (data && data.order) {
        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SZ8YGtgg5U3Z9w";
        console.log("[Payment Debug] Using Razorpay key:", razorpayKey);
        
        const options = {
          key: razorpayKey, 
          amount: data.order.amount,
          currency: data.order.currency,
          name: "InternArea Subscriptions",
          description: `Upgrade to ${plan.name} Plan`,
          order_id: data.order.id,
          handler: function (response: any) {
            toast.success(`Payment Successful! Your plan has been upgraded to ${plan.name}.`);
            setCurrentPlan(plan.name);
            // The backend webhook will automatically catch this and send the email
          },
          prefill: {
            name: user.name || "User",
            email: user.email || "test@example.com",
            contact: user.phoneNumber || "9999999999",
          },
          theme: {
            color: "#2563eb",
          },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
      }
    } catch (error: any) {
      console.error("[Payment Debug] Full error object:", error);
      console.error("[Payment Debug] Error response:", error.response?.data);
      console.error("[Payment Debug] Error status:", error.response?.status);
      console.error("[Payment Debug] Error message:", error.message);
      
      if (error.response && error.response.status === 403) {
        toast.error(error.response.data.error || "Payments not allowed at this time.");
      } else if (error.response) {
        toast.error(error.response.data?.error || `Server error (${error.response.status}). Please try again.`);
      } else if (error.code === "ERR_NETWORK" || error.message?.includes("Network")) {
        toast.error("Cannot reach server. The backend may be starting up — please wait 30s and try again.");
      } else {
        toast.error("Failed to create order. Please try again later.");
      }
    }
    setLoading(false);
  };

  const isCurrentPlan = (planName: string) => planName === currentPlan;
  const isPlanDowngrade = (planName: string) => {
    const order = ["Free", "Bronze", "Silver", "Gold"];
    return order.indexOf(planName) < order.indexOf(currentPlan);
  };

  return (
    <>
      <Head>
        <title>Subscription Plans - InternArea</title>
      </Head>
      <div className="py-12 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              {t("subscription.title")}
            </h2>
            <p className="max-w-2xl mt-4 mx-auto text-xl text-gray-500">
              {t("subscription.subtitle")}
            </p>
            {user && (
              <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                <span>{t("subscription.currentPlan")}:&nbsp;</span>
                <span className="font-bold">{currentPlan}</span>
              </div>
            )}
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-8">
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan.name);
              const isDowngrade = isPlanDowngrade(plan.name);
              const shouldDisable = plan.disabled || isCurrent || isDowngrade;

              return (
                <div
                  key={plan.name}
                  className={`relative bg-white border rounded-2xl shadow-sm flex flex-col p-8 w-full md:w-80 hover:shadow-xl transition-all duration-300 ${
                    isCurrent
                      ? `border-2 border-blue-500 ring-2 ring-blue-200`
                      : plan.popular
                      ? "border-2 border-yellow-400"
                      : "border-gray-200"
                  }`}
                >
                  {/* Current Plan Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                        YOUR PLAN
                      </span>
                    </div>
                  )}

                  {/* Popular Badge */}
                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-yellow-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className="mb-6 border-b border-gray-200 pb-6">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} text-white mb-4`}>
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-4xl font-extrabold text-blue-600">
                      {plan.price}
                      <span className="text-base font-normal text-gray-500">{plan.priceSubtext}</span>
                    </p>
                  </div>
                  
                  <ul className="mb-8 flex-1 space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !shouldDisable && displayRazorpay(plan)}
                    disabled={shouldDisable || loading}
                    className={`w-full py-4 px-6 rounded-lg font-bold text-center transition-all duration-200 ${
                      isCurrent
                        ? "bg-blue-100 text-blue-600 cursor-default"
                        : shouldDisable
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    }`}
                  >
                    {loading && !shouldDisable
                      ? "Processing..."
                      : isCurrent
                      ? "✓ Current Plan"
                      : isDowngrade
                      ? "Already on higher plan"
                      : plan.buttonText}
                  </button>
                </div>
              );
            })}
          </div>
          
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>Payments are securely processed via Razorpay.</p>
            <p className="font-bold mt-2">Note: Payments are only accepted between 10:00 AM and 11:00 AM IST strictly.</p>
            <p className="mt-2 text-gray-400">Application limits are shared across Internships and Jobs.</p>
          </div>
        </div>
      </div>
    </>
  );
}
