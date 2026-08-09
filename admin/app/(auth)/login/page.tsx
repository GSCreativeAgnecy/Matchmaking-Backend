"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiClientError } from "@/lib/api/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const totpSchema = z.object({
  code: z.string().min(6, "Enter the 6-digit code").max(12),
});

type LoginValues = z.infer<typeof loginSchema>;
type TotpValues = z.infer<typeof totpSchema>;

export default function LoginPage() {
  const { login, completeMfa } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const totpForm = useForm<TotpValues>({ resolver: zodResolver(totpSchema) });

  const onLogin = async (values: LoginValues) => {
    setBusy(true);
    try {
      const result = await login(values.email, values.password);
      if (result.requires_2fa && result.mfa_token) {
        setMfaToken(result.mfa_token);
        setTimeout(() => totpForm.setFocus("code"), 50);
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: err instanceof ApiClientError ? err.message : "Please check your credentials.",
      });
    } finally {
      setBusy(false);
    }
  };

  const onTotp = async (values: TotpValues) => {
    if (!mfaToken) return;
    setBusy(true);
    try {
      await completeMfa(mfaToken, values.code);
      router.replace("/dashboard");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: err instanceof ApiClientError ? err.message : "Invalid code.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Heart className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold">Matchmaking Admin</h1>
          <p className="text-sm text-muted-foreground">Operations console</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mfaToken ? "Two-factor authentication" : "Sign in"}</CardTitle>
            <CardDescription>
              {mfaToken
                ? "Enter the code from your authenticator app or a recovery code."
                : "Use your admin credentials to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!mfaToken ? (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            ) : (
              <form onSubmit={totpForm.handleSubmit(onTotp)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Verification code</Label>
                  <Input id="code" inputMode="numeric" autoComplete="one-time-code" {...totpForm.register("code")} />
                  {totpForm.formState.errors.code && (
                    <p className="text-xs text-destructive">{totpForm.formState.errors.code.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Verifying…" : "Verify"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setMfaToken(null);
                    loginForm.reset();
                  }}
                >
                  Back
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
