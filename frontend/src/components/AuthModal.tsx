import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LockIcon, MailIcon, UserIcon, ArrowRightIcon } from "lucide-react";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authPrompt, login, signup, verifyEmail } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "verify">("login");
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setError(null);
    setIsSubmitting(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(name, email, password);
      setMode("verify");
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyEmail(email, otp);
      await login(email, password);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Verification failed. Check your OTP code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogPopup className="max-w-md p-6">
        <DialogHeader className="p-0 mb-4">
          <DialogTitle className="text-xl font-bold">
            {mode === "login" && "Welcome Back"}
            {mode === "signup" && "Create an Account"}
            {mode === "verify" && "Verify Your Email"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {mode === "verify"
              ? `Enter the 6-digit verification code sent to ${email} (logged to server console).`
              : authPrompt}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4 text-xs py-2 px-3">
            <AlertTitle className="font-semibold text-xs">Error</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Email Address</Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Password</Label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full mt-2 font-medium">
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Full Name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Email Address</Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Password (min 6 characters)</Label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full mt-2 font-medium">
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {mode === "verify" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground">
              💡 <strong>Dev Hint:</strong> Check your backend terminal log or open{" "}
              <code className="bg-background px-1 py-0.5 rounded text-foreground">
                /api/auth/dev-tokens
              </code>{" "}
              to grab the simulated 6-digit OTP code.
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">6-Digit OTP Code</Label>
              <Input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                placeholder="123456"
                className="text-center font-mono text-lg tracking-widest"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full font-medium gap-1.5">
              {isSubmitting ? "Verifying..." : "Verify & Continue"}
              <ArrowRightIcon className="h-4 w-4" />
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Wrong email?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </DialogPopup>
    </Dialog>
  );
}
