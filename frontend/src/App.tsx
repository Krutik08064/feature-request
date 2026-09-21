import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { NewPostDialog } from "@/components/NewPostDialog";
import { FeedPage } from "@/pages/FeedPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { RoadmapPage } from "@/pages/RoadmapPage";
import { AdminPage } from "@/pages/AdminPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

export function App() {
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider position="bottom-right">
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased selection:bg-primary/20 selection:text-primary">
              <Navbar onOpenNewPost={() => setIsNewPostOpen(true)} />

              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<FeedPage />} />
                  <Route path="/posts/:id" element={<PostDetailPage />} />
                  <Route path="/roadmap" element={<RoadmapPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Routes>
              </main>

              {/* Global Modals */}
              <AuthModal />
              <NewPostDialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen} />

              <footer className="border-t border-border/40 py-6 mt-12 text-center text-xs text-muted-foreground">
                <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <p>© {new Date().getFullYear()} ComBot Portal. All rights reserved.</p>
                  <p className="flex items-center gap-3">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Operational • FastAPI Motor + Coss UI (Base UI)
                  </p>
                </div>
              </footer>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
