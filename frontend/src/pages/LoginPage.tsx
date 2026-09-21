import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LockIcon, MailIcon, SparklesIcon } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please verify your credentials.");
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
          <h1 className="text-2xl font-bold tracking-tight">Sign In to ComBot</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your credentials to vote, comment, and submit feature requests.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-5 text-xs">
            <AlertTitle className="text-xs font-semibold">Login Failed</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Demo Credentials Box */}
        <div className="mb-5 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Demo Accounts:</p>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <div>
              <span className="font-mono text-primary font-medium">admin@combot.dev</span>
              <br />
              <span className="text-muted-foreground">Admin123!</span> (Admin)
            </div>
            <div>
              <span className="font-mono text-primary font-medium">alex@combot.dev</span>
              <br />
              <span className="text-muted-foreground">User123!</span> (User)
            </div>
          </div>
        </div>

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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-semibold shadow-sm mt-2"
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create account
          </Link>
        </div>
      </Card>
    </div>
  );
}
