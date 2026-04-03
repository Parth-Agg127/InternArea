import Head from "next/head";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { toast } from "react-toastify";

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
    features: ["1 Internship Application/month", "Basic Support"],
    buttonText: "Current Plan",
    disabled: true,
  },
  {
    name: "Bronze",
    price: "₹100/month",
    features: ["3 Internship Applications/month", "Email Support", "Resume Template"],
    buttonText: "Upgrade to Bronze",
    disabled: false,
    planId: "Bronze"
  },
  {
    name: "Silver",
    price: "₹300/month",
    features: ["5 Internship Applications/month", "Priority Email Support", "Resume Feedback"],
    buttonText: "Upgrade to Silver",
    disabled: false,
    planId: "Silver"
  },
  {
    name: "Gold",
    price: "₹1000/month",
    features: ["Unlimited Applications", "1-on-1 Mentorship", "Direct Referrals"],
    buttonText: "Upgrade to Gold",
    disabled: false,
    planId: "Gold"
  },
];

export default function Subscription() {
  const user = useSelector(selectuser);
  const [loading, setLoading] = useState(false);

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
      
      const { data } = await axios.post(API_URL, {
        userId: user._id || user.uid,
        plan: plan.planId,
      });

      if (data && data.order) {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "YOUR_FRONTEND_RAZORPAY_KEY", 
          amount: data.order.amount,
          currency: data.order.currency,
          name: "InternArea Subscriptions",
          description: `Upgrade to ${plan.name} Plan`,
          order_id: data.order.id,
          handler: function (response: any) {
            toast.success(`Payment Successful! Signature: ${response.razorpay_signature}`);
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
      if (error.response && error.response.status === 403) {
        toast.error(error.response.data.error || "Payments not allowed at this time.");
      } else {
        toast.error("Failed to create order. Is your backend running?");
      }
      console.error(error);
    }
    setLoading(false);
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
              Choose the right plan for you
            </h2>
            <p className="max-w-2xl mt-4 mx-auto text-xl text-gray-500">
              Upgrade your account to unlock more internship opportunities and supercharge your career.
            </p>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col p-8 w-full md:w-80 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="mb-6 border-b border-gray-200 pb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-4xl font-extrabold text-blue-600">{plan.price}</p>
                </div>
                
                <ul className="mb-8 flex-1 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-6 w-6 text-green-500 mr-2 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !plan.disabled && displayRazorpay(plan)}
                  disabled={plan.disabled || loading}
                  className={`w-full py-4 px-6 rounded-lg font-bold text-center transition-colors duration-200 ${
                    plan.disabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                  }`}
                >
                  {loading && !plan.disabled ? "Processing..." : plan.buttonText}
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>Payments are securely processed via Razorpay.</p>
            <p className="font-bold mt-2">Note: Payments are only accepted between 10:00 AM and 11:00 AM IST strictly.</p>
          </div>
        </div>
      </div>
    </>
  );
}
