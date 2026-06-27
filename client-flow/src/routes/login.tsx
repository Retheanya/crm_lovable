import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Mail, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc]">
      <div className="order-2 lg:order-1 flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 w-full max-w-[500px] mx-auto lg:mx-0 z-10 bg-[#f8fafc]">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <div className="text-[18px] font-bold text-foreground">Pulse CRM</div>
              <div className="text-[12px] text-muted-foreground">Enterprise</div>
            </div>
          </div>
          
          <h2 className="mt-8 text-[24px] font-bold tracking-tight text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Access your dashboard and manage your pipeline.
          </p>

          <div className="mt-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-xl bg-red-50 p-4 text-[13px] text-red-600 border border-red-100">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-[14px] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                ) : (
                  <>Sign in <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="order-1 lg:order-2 relative w-full h-64 lg:h-auto lg:w-0 flex-1 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-slate-900/0 z-10"></div>
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-overlay"
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2850&auto=format&fit=crop"
          alt="Office dashboard"
        />
        <div className="absolute inset-0 flex flex-col justify-center px-8 lg:px-24 z-20">
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">Supercharge your sales team.</h1>
          <p className="mt-2 lg:mt-4 text-sm lg:text-lg text-slate-300 max-w-xl">
            Pulse CRM gives you the insights and automation you need to close more deals, faster than ever before.
          </p>
        </div>
      </div>
    </div>
  );
}
