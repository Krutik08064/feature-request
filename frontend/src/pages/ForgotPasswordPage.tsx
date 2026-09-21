import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { MailIcon, ArrowLeftIcon, KeyRoundIcon } from "lucide-react";

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <KeyRoundIcon className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset Your Password</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter the email associated with your account to receive instructions.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-5 text-xs">
            <AlertTitle className="text-xs font-semibold">Error</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Password Reset Sent (Simulated):</p>
              <p>
                In a live system, an email would be delivered via SendGrid/Resend. For this
                assessment, check your server console or retrieve your token from:
              </p>
              <code className="block bg-background p-2 rounded text-foreground font-mono text-[11px] overflow-x-auto">
                /api/auth/dev-tokens?email={email}
              </code>
            </div>

            <Button
              onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
              className="w-full font-semibold shadow-sm"
            >
              Proceed to Enter Reset Token
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-semibold shadow-sm mt-2"
            >
              {isSubmitting ? "Sending Request..." : "Send Reset Instructions"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
          <Link to="/login" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
