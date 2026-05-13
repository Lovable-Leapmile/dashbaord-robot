import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { storeAuthToken } from "@/lib/auth";
import { secureStorage } from "@/lib/secureStorage";
import { getApiUrl } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLoginLogo } from "@/hooks/useTheme";
import loginIllustration from "@/assets/login.gif";
import defaultLogo from "@/assets/logo.png";

const LoginForm = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCpOld, setShowCpOld] = useState(false);
  const [showCpNew, setShowCpNew] = useState(false);
  const [showCpConfirm, setShowCpConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpPhone, setCpPhone] = useState("");
  const [cpOldPassword, setCpOldPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const dynamicLogo = useLoginLogo();
  const logo = dynamicLogo || defaultLogo;

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];'`~]).{6,}$/;

  const resetChangePasswordForm = () => {
    setCpPhone("");
    setCpOldPassword("");
    setCpNewPassword("");
    setCpConfirmPassword("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cpPhone.length !== 10) {
      toast({ title: "Invalid Phone Number", description: "Phone number must be exactly 10 digits", variant: "destructive" });
      return;
    }

    if (cpNewPassword !== cpConfirmPassword) {
      toast({ title: "Password Mismatch", description: "New password and re-entered password do not match", variant: "destructive" });
      return;
    }

    if (!passwordRegex.test(cpNewPassword)) {
      toast({
        title: "Weak Password",
        description: "Password must contain uppercase, special characters, numbers and minimum 6 digits",
        variant: "destructive",
      });
      return;
    }

    setCpLoading(true);
    try {
      // Step 1: validate old password to obtain token
      const validateRes = await fetch(getApiUrl(`/user/validate`), {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_phone: cpPhone,
          password: cpOldPassword,
        }),
      });
      const validateData = await validateRes.json().catch(() => ({} as any));

      if (!validateRes.ok || validateData.status === "failure") {
        toast({
          title: "Validation Failed",
          description: validateData.message || "Invalid mobile number or old password",
          variant: "destructive",
        });
        setCpLoading(false);
        return;
      }

      const rawToken =
        validateData.token ??
        validateData.access_token ??
        validateData.auth_token ??
        validateData.authorization ??
        validateData.Authorization ??
        validateData.jwt ??
        validateData.jwt_token;

      if (!rawToken) {
        toast({
          title: "Failed",
          description: "Authentication token not received from validate API",
          variant: "destructive",
        });
        setCpLoading(false);
        return;
      }

      const tokenStr = String(rawToken).trim();
      const authHeader = tokenStr.toLowerCase().startsWith("bearer ")
        ? tokenStr
        : `Bearer ${tokenStr}`;

      // Step 2: PATCH change_password with token
      const url = getApiUrl(`/user/user/change_password`);
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          user_phone: cpPhone,
          old_password: cpOldPassword,
          new_password: cpNewPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.status === "success" || data.status_code === 200)) {
        toast({ title: "Success", description: data.message || "Password changed successfully" });
        setShowChangePassword(false);
        resetChangePasswordForm();
      } else {
        toast({
          title: "Failed",
          description: data.message || "Not authenticated",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect to server", variant: "destructive" });
    } finally {
      setCpLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mobileNumber.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone number must be exactly 10 digits",
        variant: "destructive",
      });
      phoneInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(getApiUrl(`/user/validate`), {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_phone: mobileNumber,
          password: password,
        }),
      });
      const data = await response.json();

      if (response.ok && data.user_id && data.user_name) {
        // Store user data (encrypted)
        secureStorage.setItem("user_id", data.user_id);
        secureStorage.setItem("user_name", data.user_name);

        // Store token (if API returns it) so all pages can use the same token after login
        const possibleToken =
          data.token ?? data.access_token ?? data.auth_token ?? data.authorization ?? data.Authorization;
        if (possibleToken) {
          storeAuthToken(possibleToken);
        }

        // Store login timestamp for 7-day session expiration (encrypted)
        const loginTimestamp = Date.now();
        secureStorage.setItem("login_timestamp", loginTimestamp.toString());

        navigate("/home");
      } else {
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
        setTimeout(() => {
          phoneInputRef.current?.focus();
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 animate-fade-in">
      {/* Logo on Top */}
      <div className="flex justify-center mb-8 animate-scale-in">
        <img 
          src={logo} 
          alt="Leapmile Robotics" 
          className="object-contain drop-shadow-2xl"
          style={{ width: '220px' }}
        />
      </div>

      {/* Login Container with Enhanced Design */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20 hover:shadow-[0_20px_60px_-15px_rgba(53,28,117,0.3)] transition-all duration-500">
        {/* Decorative Top Border with Animation */}
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"></div>
        </div>
        
        {/* Login Illustration and Title - Side by Side with Enhanced Design */}
        <div className="relative bg-gradient-to-b from-primary/5 to-transparent pt-8 pb-6">
          <div className="flex items-center justify-center gap-6">
            <div className="animate-scale-in">
              <img 
                src={loginIllustration} 
                alt="Login illustration" 
                className="w-20 h-20 object-contain hover:scale-110 transition-transform duration-300"
              />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-fade-in">
              Login
            </h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-6 md:px-8 pb-6 space-y-5">
          {/* Mobile Number Field */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-sm font-semibold text-gray-700">
              Enter Mobile Number
            </Label>
            <Input
              ref={phoneInputRef}
              id="mobile"
              type="tel"
              value={mobileNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 10) {
                  setMobileNumber(value);
                }
              }}
              className="w-full rounded-xl border-2 border-gray-200 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all py-6 text-base"
              placeholder="Enter your mobile number"
              minLength={10}
              maxLength={10}
              required
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 10) {
                    setPassword(value);
                  }
                }}
                className="w-full rounded-xl border-2 border-gray-200 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all py-6 text-base pr-12"
                placeholder="Enter your password"
                maxLength={10}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors duration-200 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
                ) : (
                  <Eye className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Password must contain uppercase, special characters &amp; numbers
            </p>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl py-6 font-semibold text-base transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 mt-8 bg-primary text-primary-foreground"
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="text-sm text-primary hover:underline font-medium"
            >
              Change Password
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Dialog */}
      <Dialog
        open={showChangePassword}
        onOpenChange={(open) => {
          setShowChangePassword(open);
          if (!open) resetChangePasswordForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your mobile number and old password to verify, then set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp-phone">Mobile Number</Label>
              <Input
                id="cp-phone"
                type="tel"
                value={cpPhone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (v.length <= 10) setCpPhone(v);
                }}
                placeholder="Enter mobile number"
                maxLength={10}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-old">Old Password</Label>
              <div className="relative">
                <Input
                  id="cp-old"
                  type={showCpOld ? "text" : "password"}
                  value={cpOldPassword}
                  onChange={(e) => setCpOldPassword(e.target.value)}
                  placeholder="Enter old password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCpOld(!showCpOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showCpOld ? "Hide password" : "Show password"}
                >
                  {showCpOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-new">New Password</Label>
              <div className="relative">
                <Input
                  id="cp-new"
                  type={showCpNew ? "text" : "password"}
                  value={cpNewPassword}
                  onChange={(e) => setCpNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCpNew(!showCpNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showCpNew ? "Hide password" : "Show password"}
                >
                  {showCpNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-confirm">Re-enter New Password</Label>
              <div className="relative">
                <Input
                  id="cp-confirm"
                  type={showCpConfirm ? "text" : "password"}
                  value={cpConfirmPassword}
                  onChange={(e) => setCpConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCpConfirm(!showCpConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showCpConfirm ? "Hide password" : "Show password"}
                >
                  {showCpConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must contain uppercase, special characters, numbers &amp; minimum 6 digits
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowChangePassword(false);
                  resetChangePasswordForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={cpLoading}>
                {cpLoading ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
        <p>© 2024 All Rights Reserved | Leapmile Logistics Pvt.Ltd</p>
        <a 
          href="https://leapmile.com/terms-and-privacy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Terms and Condition & Privacy Policy / Cookies Policy
        </a>
      </div>
    </div>
  );
};

export default LoginForm;
