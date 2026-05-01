"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError("Invalid email or password. Please try again.");
      return;
    }

    router.push("/calendar");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-charcoal-100">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="owner@snapandprint.com"
          autoComplete="email"
          className="bg-charcoal-800 border-charcoal-600 text-white placeholder:text-charcoal-400 focus-visible:ring-brand-500"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-charcoal-100">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            className="bg-charcoal-800 border-charcoal-600 text-white placeholder:text-charcoal-400 focus-visible:ring-brand-500 pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-200"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-300">
          {serverError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold h-11"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
