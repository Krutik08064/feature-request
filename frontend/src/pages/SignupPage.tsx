import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { OTPField, OTPFieldInput, OTPFieldSeparator } from "@/components/ui/otp-field";
import { LockIcon, MailIcon, UserIcon, SparklesIcon, CheckCircle2Icon } from "lucide-react";

export function SignupPage() {
  const { signup, verifyEmail, login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signup(name, email, password);
      setStep("verify");
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
      // Auto-login after verification
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Verification failed. Check your OTP code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {step === "signup" ? "Join ComBot Community" : "Verify Your Email"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {step === "signup"
              ? "Propose ideas and help prioritize the roadmap."
              : `We sent a simulated 6-digit verification code to ${email}.`}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-5 text-xs">
            <AlertTitle className="text-xs font-semibold">Error</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {step === "signup" ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Name</Label>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Address</Label>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Password</Label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-semibold shadow-sm mt-2"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Simulated Email Verification:</p>
              Check the backend terminal output or query{" "}
              <code className="bg-background px-1 py-0.5 rounded text-foreground font-mono text-[11px]">
                /api/auth/dev-tokens
              </code>{" "}
              to copy your simulated OTP code.
            </div>

            <div className="flex flex-col items-center gap-2">
              <Label className="text-xs font-semibold">Enter 6-Digit Code</Label>
              <Input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                placeholder="123456"
                className="text-center font-mono text-xl tracking-[0.4em] max-w-[200px] h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || otp.length < 6}
              className="w-full font-semibold shadow-sm gap-2"
            >
              <CheckCircle2Icon className="h-4 w-4" />
              {isSubmitting ? "Verifying..." : "Verify & Continue"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep("signup")}
                className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Change Email / Back
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
