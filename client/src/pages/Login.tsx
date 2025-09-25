import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Lock,
  User,
  AlertCircle,
  Shield,
  ChevronRight,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setLocation("/");
        window.location.reload();
      } else {
        setError(data.error || "Erreur de connexion");
      }
    } catch (error) {
      setError("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F2A43] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated geometric shapes - Charte KLYXOR style */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#C9A646] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-[#C9A646] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-white rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float-slow"></div>

        {/* Geometric patterns */}
        <div className="absolute top-10 right-10 w-32 h-32 border-2 border-[#C9A646] opacity-10 rotate-45 animate-rotate-slow"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 border-2 border-white opacity-10 animate-rotate-reverse"></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-[#C9A646] opacity-10 animate-pulse"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and branding - Charte KLYXOR */}
        <div className="text-center mb-8 animate-slideDown">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#C9A646] blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative bg-[#0F2A43] p-4 rounded-2xl border-2 border-[#C9A646] shadow-2xl">
                <Rocket className="w-12 h-12 text-[#C9A646] animate-float-icon" />
              </div>
            </div>
          </div>

          <h1 className="text-6xl font-bold text-white mb-2 tracking-wider font-poppins animate-glow">
            KLYXOR
          </h1>
          <div className="flex items-center justify-center space-x-2 text-[#C9A646]">
            <Sparkles className="w-4 h-4 animate-sparkle" />
            <p className="text-sm font-medium tracking-widest uppercase">
              Contract Lifecycle Management
            </p>
            <Sparkles className="w-4 h-4 animate-sparkle-delayed" />
          </div>
          {/*      <p className="text-white/60 text-xs mt-2">Powered by ENGIE</p> */}
        </div>

        {/* Login Card - Style épuré et moderne */}
        <Card className="backdrop-blur-xl bg-white/5 border-[#C9A646]/30 shadow-2xl animate-slideUp hover:shadow-[#C9A646]/20 transition-all duration-500">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2 font-poppins">
                Connexion Sécurisée
              </h2>
              <div className="flex items-center justify-center text-[#C9A646]/80">
                <Shield className="w-4 h-4 mr-2" />
                <span className="text-xs uppercase tracking-wide">
                  Environnement Protégé
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="bg-red-500/10 border-red-500/50 text-white animate-shake">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-[#C9A646] font-medium uppercase text-xs tracking-wide"
                >
                  Identifiant
                </Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#C9A646]/60 group-focus-within:text-[#C9A646] transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin.engie"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-11 h-12 bg-white/5 border-[#C9A646]/30 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-[#C9A646] transition-all hover:border-[#C9A646]/50"
                    required
                    disabled={isLoading}
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-[#C9A646] font-medium uppercase text-xs tracking-wide"
                >
                  Mot de passe
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#C9A646]/60 group-focus-within:text-[#C9A646] transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 bg-white/5 border-[#C9A646]/30 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-[#C9A646] transition-all hover:border-[#C9A646]/50"
                    required
                    disabled={isLoading}
                    data-testid="input-password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#C9A646] hover:bg-[#C9A646]/90 text-[#0F2A43] font-bold shadow-lg hover:shadow-[#C9A646]/30 transform transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-wide"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  <span className="flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#0F2A43]/30 border-t-[#0F2A43] rounded-full animate-spin mr-3"></div>
                        Connexion...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Se Connecter
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>
              </div>
            </form>

            {/* Security badges - Style KLYXOR */}
            <div className="mt-8 pt-6 border-t border-[#C9A646]/20">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="group cursor-pointer">
                  <div className="bg-white/5 rounded-lg p-3 border border-[#C9A646]/20 group-hover:border-[#C9A646]/50 transition-all">
                    <Shield className="w-5 h-5 mx-auto mb-1 text-[#C9A646]" />
                    <span className="text-[10px] text-white/60">ISO 27001</span>
                  </div>
                </div>
                <div className="group cursor-pointer">
                  <div className="bg-white/5 rounded-lg p-3 border border-[#C9A646]/20 group-hover:border-[#C9A646]/50 transition-all">
                    <Lock className="w-5 h-5 mx-auto mb-1 text-[#C9A646]" />
                    <span className="text-[10px] text-white/60">RGPD</span>
                  </div>
                </div>
                <div className="group cursor-pointer">
                  <div className="bg-white/5 rounded-lg p-3 border border-[#C9A646]/20 group-hover:border-[#C9A646]/50 transition-all">
                    <Zap className="w-5 h-5 mx-auto mb-1 text-[#C9A646]" />
                    <span className="text-[10px] text-white/60">SOC 2</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer - Style minimaliste */}
        <div className="mt-8 text-center animate-fadeIn">
          <p className="text-white/40 text-xs">
            © 2025 KLYXOR - Tous droits réservés
          </p>
          <div className="flex items-center justify-center mt-2 space-x-2">
            <div className="w-1 h-1 bg-[#C9A646] rounded-full animate-pulse"></div>
            <p className="text-[#C9A646]/60 text-xs">
              Version 1.2.0 Production
            </p>
            <div className="w-1 h-1 bg-[#C9A646] rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
