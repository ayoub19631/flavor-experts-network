import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  Globe,
  Sun,
  Moon,
  Building2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import BrandLogo from "@/components/BrandLogo";
import NotificationBell from "@/components/NotificationBell";
import TestingModeBanner from "@/components/TestingModeBanner";
import { SITE } from "@/lib/site-config";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut, isAdmin, isEmailVerified } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const primaryLinks = [
    { href: "/members", label: t("nav.members") },
    { href: "/jobs", label: t("nav.jobs") },
    { href: "/community", label: t("nav.community") },
    { href: "/forum", label: t("nav.forum") },
    { href: "/market", label: t("nav.market") },
    { href: "/blog", label: t("nav.blog") },
  ];

  const exploreLinks = [
    { href: "/#about", label: t("nav.about") },
    { href: "/#news", label: t("nav.news") },
    { href: "/#resources", label: t("nav.resources") },
    { href: "/courses", label: t("nav.courses") },
    { href: "/consultations", label: t("nav.consultations") },
    { href: "/enterprise", label: t("nav.enterprise") },
    { href: "/#contact", label: t("nav.contact") },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <TestingModeBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <BrandLogo size="sm" className="transition-transform duration-300 group-hover:scale-[1.03]" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-foreground">
                {lang === "ar" ? "خبراء النكهات" : "Flavor Experts"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {lang === "ar" ? "خبرة · نكهات · علم" : SITE.tagline}
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-2.5 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-md"
              >
                {link.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-primary">
                  {t("nav.explore")}
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {exploreLinks.map((link) => (
                  <DropdownMenuItem
                    key={link.href}
                    onClick={() => {
                      if (link.href.startsWith("/#")) {
                        window.location.href = link.href;
                      } else {
                        navigate(link.href);
                      }
                    }}
                  >
                    {link.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLang}
              className="h-9 w-9"
              title={lang === "en" ? "العربية" : "English"}
            >
              <Globe className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
              title={resolvedTheme === "dark" ? (lang === "ar" ? "الوضع الفاتح" : "Light mode") : (lang === "ar" ? "الوضع الداكن" : "Dark mode")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {user && <NotificationBell />}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
                      {profile?.full_name || user.email?.split("@")[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isEmailVerified ? (
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="w-4 h-4 me-2" />
                      {t("nav.dashboard")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate(`/verify-email?email=${encodeURIComponent(user.email || "")}`)} className="text-amber-600 dark:text-amber-400 font-medium">
                      <LayoutDashboard className="w-4 h-4 me-2" />
                      {t("auth.verify_nav")}
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="text-amber-600 dark:text-amber-400 font-medium">
                      <ShieldCheck className="w-4 h-4 me-2" />
                      {t("nav.admin")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="w-4 h-4 me-2" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/auth?mode=login">
                  <Button variant="ghost" size="sm">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link to="/auth?mode=signup&type=company">
                  <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
                    <Building2 className="w-3.5 h-3.5" />
                    {t("nav.company")}
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {t("nav.signup")}
                  </Button>
                </Link>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-lg">
          <div className="px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
            <p className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("nav.primary")}
            </p>
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <p className="px-3 pt-3 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("nav.explore")}
            </p>
            {exploreLinks.map((link) =>
              link.href.startsWith("/#") ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-md"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  to={link.href}
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-md"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ),
            )}
            {!user && (
              <div className="pt-3 border-t border-border space-y-2">
                <Link to="/auth?mode=login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link to="/auth?mode=signup&type=company" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 border-primary/30 text-primary">
                    <Building2 className="w-3.5 h-3.5" />
                    {t("nav.company")}
                  </Button>
                </Link>
                <Link to="/auth?mode=signup" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    {t("nav.signup")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
