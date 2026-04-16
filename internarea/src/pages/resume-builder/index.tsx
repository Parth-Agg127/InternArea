import Head from "next/head";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FileText,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Lock,
  CheckCircle,
  Download,
  Sparkles,
  Shield,
  CreditCard,
  Loader2,
  X,
  User,
} from "lucide-react";
import { useRouter } from "next/router";

const API_BASE = "https://internarea-1-n2uz.onrender.com/api/resume";

// Razorpay script loader (reused from subscription page)
const loadScript = (src: string) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface Qualification {
  degree: string;
  institution: string;
  year: string;
  grade: string;
}

interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

interface Project {
  name: string;
  description: string;
  link: string;
}

interface ResumeFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  photoUrl: string;
  summary: string;
  qualifications: Qualification[];
  experience: Experience[];
  skills: string[];
  projects: Project[];
  certifications: string[];
}

export default function ResumeBuilder() {
  const user = useSelector(selectuser);
  const router = useRouter();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [formData, setFormData] = useState<ResumeFormData>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    photoUrl: "",
    summary: "",
    qualifications: [{ degree: "", institution: "", year: "", grade: "" }],
    experience: [{ title: "", company: "", duration: "", description: "" }],
    skills: [],
    projects: [{ name: "", description: "", link: "" }],
    certifications: [],
  });

  // Skill & certification input temps
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Success state
  const [resumePdfUrl, setResumePdfUrl] = useState("");

  // Pre-fill from user
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || "",
        email: user.email || "",
        phone: user.phoneNumber || "",
      }));
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) {
      router.push("/");
      toast.error("Please login to create a resume.");
    }
  }, [user, router]);

  // ========================
  // FORM HANDLERS
  // ========================
  const updateField = (field: keyof ResumeFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addQualification = () => {
    setFormData((prev) => ({
      ...prev,
      qualifications: [
        ...prev.qualifications,
        { degree: "", institution: "", year: "", grade: "" },
      ],
    }));
  };

  const removeQualification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index),
    }));
  };

  const updateQualification = (
    index: number,
    field: keyof Qualification,
    value: string
  ) => {
    const updated = [...formData.qualifications];
    updated[index] = { ...updated[index], [field]: value };
    updateField("qualifications", updated);
  };

  const addExperience = () => {
    setFormData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { title: "", company: "", duration: "", description: "" },
      ],
    }));
  };

  const removeExperience = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const updateExperience = (
    index: number,
    field: keyof Experience,
    value: string
  ) => {
    const updated = [...formData.experience];
    updated[index] = { ...updated[index], [field]: value };
    updateField("experience", updated);
  };

  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [...prev.projects, { name: "", description: "", link: "" }],
    }));
  };

  const removeProject = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const updateProject = (
    index: number,
    field: keyof Project,
    value: string
  ) => {
    const updated = [...formData.projects];
    updated[index] = { ...updated[index], [field]: value };
    updateField("projects", updated);
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !formData.skills.includes(trimmed)) {
      updateField("skills", [...formData.skills, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (index: number) => {
    updateField(
      "skills",
      formData.skills.filter((_, i) => i !== index)
    );
  };

  const addCertification = () => {
    const trimmed = certInput.trim();
    if (trimmed && !formData.certifications.includes(trimmed)) {
      updateField("certifications", [...formData.certifications, trimmed]);
      setCertInput("");
    }
  };

  const removeCertification = (index: number) => {
    updateField(
      "certifications",
      formData.certifications.filter((_, i) => i !== index)
    );
  };

  // ========================
  // VALIDATION
  // ========================
  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      toast.error("Full name is required.");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required.");
      return false;
    }
    if (!formData.summary.trim()) {
      toast.error("Professional summary is required.");
      return false;
    }
    return true;
  };

  // ========================
  // OTP HANDLERS
  // ========================
  const handleSendOTP = async () => {
    setOtpLoading(true);
    try {
      await axios.post(`${API_BASE}/send-otp`, { email: formData.email });
      setOtpSent(true);
      toast.success("OTP sent to your email!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send OTP.");
    }
    setOtpLoading(false);
  };

  const handleVerifyOTP = async () => {
    setOtpLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/verify-otp`, {
        email: formData.email,
        otp: otpValue,
      });
      if (data.verified) {
        setVerificationToken(data.verificationToken);
        setOtpVerified(true);
        toast.success("OTP verified! Proceed to payment.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid OTP.");
    }
    setOtpLoading(false);
  };

  // ========================
  // PAYMENT HANDLER
  // ========================
  const handlePayment = async () => {
    if (!user) {
      toast.error("Please login first.");
      return;
    }

    setPaymentLoading(true);

    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );
    if (!res) {
      toast.error("Razorpay SDK failed to load.");
      setPaymentLoading(false);
      return;
    }

    try {
      const userId = user._id || user.uid;
      const { data } = await axios.post(`${API_BASE}/checkout`, {
        userId,
        verificationToken,
      });

      if (data && data.order) {
        const options = {
          key:
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            "rzp_test_SZ8YGtgg5U3Z9w",
          amount: data.order.amount,
          currency: data.order.currency,
          name: "InternArea Resume Builder",
          description: "Professional Resume Generation — ₹50",
          order_id: data.order.id,
          handler: async function (response: any) {
            // Verify payment & generate resume
            try {
              const verifyRes = await axios.post(
                `${API_BASE}/payment-verify`,
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  resumeData: formData,
                  firebaseUid: user.uid || user.firebaseUid || user._id,
                }
              );

              if (verifyRes.data.success) {
                setResumePdfUrl(verifyRes.data.resumePdfUrl);
                setCurrentStep(4);
                toast.success("Resume generated successfully!");
              }
            } catch (verifyErr: any) {
              toast.error(
                verifyErr.response?.data?.error ||
                  "Failed to verify payment."
              );
            }
            setPaymentLoading(false);
          },
          prefill: {
            name: user.name || "User",
            email: user.email || "",
            contact: user.phoneNumber || "9999999999",
          },
          theme: {
            color: "#7c3aed",
          },
          modal: {
            ondismiss: () => {
              setPaymentLoading(false);
            },
          },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to create order."
      );
      setPaymentLoading(false);
    }
  };

  // ========================
  // STEP NAVIGATION
  // ========================
  const goNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // ========================
  // RENDER STEPS
  // ========================
  const steps = [
    { number: 1, label: "Resume Form", icon: <FileText className="h-4 w-4" /> },
    { number: 2, label: "Verify Email", icon: <Shield className="h-4 w-4" /> },
    { number: 3, label: "Payment", icon: <CreditCard className="h-4 w-4" /> },
    { number: 4, label: "Success", icon: <CheckCircle className="h-4 w-4" /> },
  ];

  return (
    <>
      <Head>
        <title>Resume Builder - InternArea</title>
        <meta
          name="description"
          content="Create your professional resume with InternArea's premium resume builder."
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white mb-4 shadow-lg">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Professional Resume Builder
            </h1>
            <p className="mt-2 text-gray-500 max-w-xl mx-auto">
              Create a stunning, professional resume in minutes. Your resume
              will be automatically attached to all future applications.
            </p>
            <div className="mt-3 inline-flex items-center px-4 py-2 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
              <Sparkles className="h-4 w-4 mr-2" />
              Premium Feature — ₹50 per resume
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-10">
            {steps.map((step, i) => (
              <React.Fragment key={step.number}>
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    currentStep === step.number
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105"
                      : currentStep > step.number
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.icon
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-1 transition-all duration-300 ${
                      currentStep > step.number ? "bg-green-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* ===== STEP 1: RESUME FORM ===== */}
            {currentStep === 1 && (
              <div className="p-6 sm:p-8 space-y-8">
                {/* Personal Info */}
                <section>
                  <div className="flex items-center space-x-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600">
                      <User className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Personal Information
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                        placeholder="New Delhi, India"
                      />
                    </div>
                  </div>
                </section>

                {/* Professional Summary */}
                <section>
                  <div className="flex items-center space-x-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Professional Summary <span className="text-red-500">*</span>
                    </h2>
                  </div>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => updateField("summary", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none resize-none"
                    placeholder="A brief professional summary highlighting your key strengths, experience, and career objectives..."
                  />
                </section>

                {/* Education */}
                <section>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 text-green-600">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Education
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={addQualification}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </button>
                  </div>
                  {formData.qualifications.map((qual, i) => (
                    <div
                      key={i}
                      className="relative grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      {formData.qualifications.length > 1 && (
                        <button
                          onClick={() => removeQualification(i)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <input
                        type="text"
                        value={qual.degree}
                        onChange={(e) =>
                          updateQualification(i, "degree", e.target.value)
                        }
                        placeholder="Degree (e.g., B.Tech Computer Science)"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={qual.institution}
                        onChange={(e) =>
                          updateQualification(i, "institution", e.target.value)
                        }
                        placeholder="Institution"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={qual.year}
                        onChange={(e) =>
                          updateQualification(i, "year", e.target.value)
                        }
                        placeholder="Year (e.g., 2023)"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={qual.grade}
                        onChange={(e) =>
                          updateQualification(i, "grade", e.target.value)
                        }
                        placeholder="Grade/CGPA"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </div>
                  ))}
                </section>

                {/* Experience */}
                <section>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Experience
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </button>
                  </div>
                  {formData.experience.map((exp, i) => (
                    <div
                      key={i}
                      className="relative grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      {formData.experience.length > 1 && (
                        <button
                          onClick={() => removeExperience(i)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) =>
                          updateExperience(i, "title", e.target.value)
                        }
                        placeholder="Job Title"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) =>
                          updateExperience(i, "company", e.target.value)
                        }
                        placeholder="Company"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={exp.duration}
                        onChange={(e) =>
                          updateExperience(i, "duration", e.target.value)
                        }
                        placeholder="Duration (e.g., Jan 2023 - Present)"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <textarea
                        value={exp.description}
                        onChange={(e) =>
                          updateExperience(i, "description", e.target.value)
                        }
                        placeholder="Brief description of your role..."
                        className="md:col-span-2 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                </section>

                {/* Skills */}
                <section>
                  <div className="flex items-center space-x-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600">
                      <Code className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Skills</h2>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Add a skill and press Enter"
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium group"
                      >
                        {skill}
                        <button
                          onClick={() => removeSkill(i)}
                          className="ml-2 text-purple-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </section>

                {/* Projects */}
                <section>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Projects
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={addProject}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </button>
                  </div>
                  {formData.projects.map((proj, i) => (
                    <div
                      key={i}
                      className="relative grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      {formData.projects.length > 1 && (
                        <button
                          onClick={() => removeProject(i)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <input
                        type="text"
                        value={proj.name}
                        onChange={(e) =>
                          updateProject(i, "name", e.target.value)
                        }
                        placeholder="Project Name"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={proj.link}
                        onChange={(e) =>
                          updateProject(i, "link", e.target.value)
                        }
                        placeholder="Project Link (optional)"
                        className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <textarea
                        value={proj.description}
                        onChange={(e) =>
                          updateProject(i, "description", e.target.value)
                        }
                        placeholder="Brief description..."
                        className="md:col-span-2 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                </section>

                {/* Certifications */}
                <section>
                  <div className="flex items-center space-x-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 text-rose-600">
                      <Award className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Certifications
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={certInput}
                      onChange={(e) => setCertInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCertification();
                        }
                      }}
                      placeholder="Add a certification and press Enter"
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCertification}
                      className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.certifications.map((cert, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5 bg-rose-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">{cert}</span>
                        <button
                          onClick={() => removeCertification(i)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Next Button */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={goNext}
                    className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-200 transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    Continue to Verification
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* ===== STEP 2: OTP VERIFICATION ===== */}
            {currentStep === 2 && (
              <div className="p-6 sm:p-8">
                <div className="max-w-md mx-auto text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-6 shadow-lg">
                    <Mail className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Email Verification
                  </h2>
                  <p className="text-gray-500 mb-8">
                    We'll send a 6-digit OTP to{" "}
                    <strong className="text-gray-900">{formData.email}</strong>{" "}
                    to verify your identity.
                  </p>

                  {!otpSent ? (
                    <button
                      onClick={handleSendOTP}
                      disabled={otpLoading}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {otpLoading ? (
                        <span className="inline-flex items-center">
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        <span className="inline-flex items-center">
                          <Mail className="h-5 w-5 mr-2" />
                          Send OTP
                        </span>
                      )}
                    </button>
                  ) : !otpVerified ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">
                        ✅ OTP sent to {formData.email}. Check your inbox!
                      </div>
                      <input
                        type="text"
                        value={otpValue}
                        onChange={(e) =>
                          setOtpValue(
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        className="w-full text-center text-2xl tracking-[0.5em] px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-mono"
                      />
                      <button
                        onClick={handleVerifyOTP}
                        disabled={otpLoading || otpValue.length !== 6}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {otpLoading ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          <span className="inline-flex items-center">
                            <Lock className="h-5 w-5 mr-2" />
                            Verify OTP
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setOtpSent(false);
                          setOtpValue("");
                        }}
                        className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
                      >
                        Didn't receive? Resend OTP
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-green-700 font-bold text-lg">
                          Email Verified Successfully!
                        </p>
                        <p className="text-green-600 text-sm mt-1">
                          You can now proceed to payment.
                        </p>
                      </div>
                      <button
                        onClick={goNext}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-200 transition-all duration-200"
                      >
                        <span className="inline-flex items-center">
                          Proceed to Payment
                          <ChevronRight className="h-5 w-5 ml-2" />
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Back button */}
                  <div className="mt-6">
                    <button
                      onClick={goBack}
                      className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back to form
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 3: PAYMENT ===== */}
            {currentStep === 3 && (
              <div className="p-6 sm:p-8">
                <div className="max-w-md mx-auto text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-6 shadow-lg">
                    <CreditCard className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Complete Payment
                  </h2>
                  <p className="text-gray-500 mb-8">
                    One-time fee for professional resume generation
                  </p>

                  {/* Order Summary */}
                  <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-2xl border border-gray-200 p-6 mb-8">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">
                            Resume Generation
                          </p>
                          <p className="text-sm text-gray-500">
                            Professional PDF Resume
                          </p>
                        </div>
                      </div>
                      <span className="text-2xl font-extrabold text-gray-900">
                        ₹50
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-left">
                      <div className="flex items-center text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        Professional PDF format
                      </div>
                      <div className="flex items-center text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        Auto-attached to your profile
                      </div>
                      <div className="flex items-center text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        Sent to your email
                      </div>
                      <div className="flex items-center text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        Included in future applications
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                  >
                    {paymentLoading ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      <span className="inline-flex items-center">
                        <Lock className="h-5 w-5 mr-2" />
                        Pay ₹50 — Generate Resume
                      </span>
                    )}
                  </button>

                  <p className="mt-4 text-xs text-gray-400">
                    Secured by Razorpay. Your payment information is encrypted.
                  </p>

                  {/* Back button */}
                  <div className="mt-6">
                    <button
                      onClick={goBack}
                      className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back to verification
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 4: SUCCESS ===== */}
            {currentStep === 4 && (
              <div className="p-6 sm:p-8">
                <div className="max-w-md mx-auto text-center">
                  {/* Success Animation */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full bg-green-100 animate-ping opacity-20"></div>
                    </div>
                    <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-xl">
                      <CheckCircle className="h-12 w-12" />
                    </div>
                  </div>

                  <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                    🎉 Resume Generated!
                  </h2>
                  <p className="text-gray-500 mb-8">
                    Your professional resume has been created and attached to
                    your InternArea profile.
                  </p>

                  <div className="space-y-4">
                    {resumePdfUrl && (
                      <a
                        href={resumePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-200 transition-all duration-200 transform hover:-translate-y-0.5"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Download Resume PDF
                      </a>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                      <p className="font-medium">
                        📎 Your resume is now attached to your profile!
                      </p>
                      <p className="mt-1 text-blue-600">
                        It will be automatically included when you apply for
                        internships and jobs.
                      </p>
                    </div>

                    <button
                      onClick={() => router.push("/profile")}
                      className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Go to Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
