import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Invalid username or password");
      }
      
      localStorage.setItem("lr_token", data.token);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-height-screen w-full flex items-center justify-center bg-bg px-4 py-12 md:py-24">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-md md:aspect-16/10">
        
        {/* Left Side: Solid Brand Area */}
        <div className="relative hidden w-1/2 flex-col justify-between bg-primary p-10 md:flex overflow-hidden">
          {/* Subtle radial gradient for depth */}
          <div className="absolute inset-0 bg-radial-gradient from-white/20 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center my-auto gap-6">
            {/* Big center aligned logo */}
            <div className="w-full flex items-center justify-center">
              <img 
                src="/letzryd_logo.png" 
                alt="LetzRyd logo" 
                className="h-32 w-auto object-contain filter brightness-0 invert drop-shadow-sm"
              />
            </div>
            
            <div className="flex flex-col gap-0.5 items-center text-center">
              <h2 className="font-sans text-xl lg:text-2xl font-bold tracking-tight text-white/95 leading-tight">
                Fleet Portal
              </h2>
              <p className="font-sans text-xs font-medium text-white/80 leading-snug max-w-xs mt-0.5">
                Drive in the Future of Urban Mobility.
              </p>
            </div>
          </div>
          
          <div className="relative z-10 font-sans text-[10px] font-medium tracking-wider text-white/80 text-center leading-normal flex flex-col">
            <span>LetzRyd © Copyright 2026</span>
            <span>All Rights Reserved</span>
          </div>
        </div>

        {/* Right Side: Clean Centered Login Form */}
        <div className="flex w-full flex-col justify-center px-8 py-12 md:w-1/2 md:p-16 relative z-10">
          <div className="w-full max-w-md mx-auto flex flex-col">
            
            {/* Header / Logo for mobile */}
            <div className="mb-8 md:hidden text-center">
              <img 
                src="/letzryd_logo.png" 
                alt="LetzRyd" 
                className="h-12 w-auto object-contain mx-auto mb-4"
              />
              <h1 className="font-sans text-2xl font-bold text-primary tracking-tight">
                Fleet Portal
              </h1>
            </div>

            <div className="mb-6 hidden md:block">
              <h1 className="font-sans text-3xl font-bold text-primary tracking-tight">
                Sign in
              </h1>
              <p className="font-sans text-sm text-text-muted mt-2">
                Enter your credentials to access the portal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Username field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-xs font-semibold text-text-muted" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 rounded-lg border border-border-strong/50 px-3.5 font-sans text-sm text-text bg-white placeholder:text-text-dim outline-none focus:border-2 focus:border-primary transition-all"
                />
              </div>

              {/* Password field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-xs font-semibold text-text-muted" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border-strong/50 pl-3.5 pr-11 font-sans text-sm text-text bg-white placeholder:text-text-dim outline-none focus:border-2 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors p-1 rounded-sm cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-sans text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-sans text-sm font-semibold text-white shadow-sm hover:bg-primary-hover active:opacity-90 disabled:opacity-75 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}