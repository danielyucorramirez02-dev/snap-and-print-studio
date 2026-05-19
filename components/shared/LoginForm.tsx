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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-charcoal-700 transition-colors duration-500 dark:text-charcoal-200">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="owner@snapandprint.com"
          autoComplete="email"
          className="h-10 border-charcoal-950/15 bg-white/85 text-charcoal-950 shadow-sm transition-all duration-200 placeholder:text-charcoal-400 focus-visible:border-[#43b8b2]/50 focus-visible:ring-[#43b8b2]/35 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-charcoal-500"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-charcoal-700 transition-colors duration-500 dark:text-charcoal-200">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete="current-password"
            className="h-10 border-charcoal-950/15 bg-white/85 pr-10 text-charcoal-950 shadow-sm transition-all duration-200 placeholder:text-charcoal-400 focus-visible:border-[#43b8b2]/50 focus-visible:ring-[#43b8b2]/35 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-charcoal-500"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal-400 transition-colors hover:bg-charcoal-950/5 hover:text-charcoal-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-10 w-full bg-charcoal-950 font-semibold text-white shadow-lg shadow-charcoal-950/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-charcoal-900 hover:shadow-xl hover:shadow-[#43b8b2]/15 dark:bg-white dark:text-charcoal-950 dark:hover:bg-charcoal-100"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
