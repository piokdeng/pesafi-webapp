"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Building2, Mail, Lock, Phone, MapPin } from "lucide-react";

export const BusinessRegisterForm = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    // User Account Details
    email: "",
    password: "",
    confirmPassword: "",

    // Business Details
    businessName: "",
    businessType: "",
    registrationNumber: "",
    taxId: "",

    // Contact
    businessEmail: "",
    businessPhone: "",

    // Address
    country: "Kenya",
    city: "",
    stateRegion: "",
    postalCode: "",
    streetAddress: "",

    // Additional
    industry: "",
    description: "",
    website: "",
  });

  const businessTypes = [
    { value: "sole_proprietorship", label: "Sole Proprietorship" },
    { value: "partnership", label: "Partnership" },
    { value: "llc", label: "Limited Liability Company (LLC)" },
    { value: "corporation", label: "Corporation" },
    { value: "ngo", label: "Non-Governmental Organization (NGO)" },
  ];

  const industries = [
    "Retail", "Food & Beverage", "Technology", "Healthcare",
    "Education", "Professional Services", "Transportation",
    "Real Estate", "Manufacturing", "Agriculture", "Other"
  ];

  const countries = [
    "Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia",
    "South Sudan", "Somalia", "Burundi"
  ];

  const validateStep1 = () => {
    if (!form.email || !form.password || !form.businessName || !form.businessType) {
      toast.error("Please fill in all required fields");
      return false;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleContinue = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      handleContinue();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Registration failed. Please try again.");
        return;
      }

      toast.success("Business account created successfully! Redirecting to dashboard...");

      // Redirect to business dashboard
      setTimeout(() => {
        router.push("/business/dashboard");
      }, 1500);
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-muted'}`} />
        <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-muted'}`} />
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="font-semibold text-lg">Account Information</h3>
            <p className="text-sm text-muted-foreground">Create your business account</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="business@company.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                className="pl-10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
                className="pl-10"
              />
            </div>
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="businessName"
                type="text"
                placeholder="Your Company Ltd"
                value={form.businessName}
                onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                required
                className="pl-10"
              />
            </div>
          </div>

          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type *</Label>
            <Select value={form.businessType} onValueChange={(value) => setForm((p) => ({ ...p, businessType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            onClick={handleContinue}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
          >
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="font-semibold text-lg">Business Details</h3>
            <p className="text-sm text-muted-foreground">Help us verify your business</p>
          </div>

          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Company Registration Number</Label>
            <Input
              id="registrationNumber"
              type="text"
              placeholder="e.g., PVT-123456"
              value={form.registrationNumber}
              onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value }))}
            />
          </div>

          {/* Tax ID */}
          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID / VAT Number</Label>
            <Input
              id="taxId"
              type="text"
              placeholder="e.g., A001234567Z"
              value={form.taxId}
              onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
            />
          </div>

          {/* Business Email */}
          <div className="space-y-2">
            <Label htmlFor="businessEmail">Business Email</Label>
            <Input
              id="businessEmail"
              type="email"
              placeholder="contact@company.com"
              value={form.businessEmail}
              onChange={(e) => setForm((p) => ({ ...p, businessEmail: e.target.value }))}
            />
          </div>

          {/* Business Phone */}
          <div className="space-y-2">
            <Label htmlFor="businessPhone">Business Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="businessPhone"
                type="tel"
                placeholder="+254 700 000000"
                value={form.businessPhone}
                onChange={(e) => setForm((p) => ({ ...p, businessPhone: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={form.country} onValueChange={(value) => setForm((p) => ({ ...p, country: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              type="text"
              placeholder="Nairobi"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            />
          </div>

          {/* Street Address */}
          <div className="space-y-2">
            <Label htmlFor="streetAddress">Street Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="streetAddress"
                placeholder="Building, Street, Area"
                value={form.streetAddress}
                onChange={(e) => setForm((p) => ({ ...p, streetAddress: e.target.value }))}
                className="pl-10 min-h-[60px]"
              />
            </div>
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select value={form.industry} onValueChange={(value) => setForm((p) => ({ ...p, industry: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://yourcompany.com"
              value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us about your business..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Business Account"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
};
