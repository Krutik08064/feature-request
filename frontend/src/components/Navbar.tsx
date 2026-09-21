import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuSeparator,
} from "@/components/ui/menu";
import {
  LayersIcon,
  MapPinIcon,
  ShieldCheckIcon,
  PlusIcon,
  LogOutIcon,
  LogInIcon,
  UserPlusIcon,
  SparklesIcon,
} from "lucide-react";

interface NavbarProps {
  onOpenNewPost?: () => void;
}

export function Navbar({ onOpenNewPost }: NavbarProps) {
  const { user, logout, openAuthModal } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg leading-none font-extrabold text-foreground">
                Com<span className="text-primary/70">Bot</span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Feedback & Roadmap
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <Link
              to="/"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/")
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <LayersIcon className="h-4 w-4" />
              Feed
            </Link>

            <Link
              to="/roadmap"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/roadmap")
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <MapPinIcon className="h-4 w-4" />
              Roadmap
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                Live
              </Badge>
            </Link>

            {user?.role === "admin" && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/admin")
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <ShieldCheckIcon className="h-4 w-4 text-warning" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {onOpenNewPost && (
            <Button
              onClick={() => {
                if (!user) {
                  openAuthModal("Sign in to submit a new feature request");
                } else {
                  onOpenNewPost();
                }
              }}
              size="sm"
              className="hidden sm:flex items-center gap-1.5 font-medium shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              New Request
            </Button>
          )}

          {user ? (
            <Menu>
              <MenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9 border border-border cursor-pointer hover:opacity-90 transition-opacity">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </MenuTrigger>
              <MenuPopup align="end" className="w-56 p-1">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <div className="mt-1.5">
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-[10px]">
                      {user.role === "admin" ? "Administrator" : "Community Member"}
                    </Badge>
                  </div>
                </div>
                <MenuSeparator />
                {user.role === "admin" && (
                  <MenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                      <ShieldCheckIcon className="h-4 w-4 text-warning" />
                      Admin Dashboard
                    </Link>
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => logout()}
                  className="flex items-center gap-2 text-destructive cursor-pointer focus:text-destructive"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Sign Out
                </MenuItem>
              </MenuPopup>
            </Menu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuthModal("Sign in to access your feedback")}
                className="gap-1.5"
              >
                <LogInIcon className="h-4 w-4" />
                Sign In
              </Button>
              <Link to="/signup">
                <Button size="sm" variant="outline" className="hidden sm:flex gap-1.5">
                  <UserPlusIcon className="h-4 w-4" />
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
