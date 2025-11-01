import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "@/components/LoginButton";
import { UserButton } from "@/components/UserButton";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Polls App - Mapping Opinions & Beliefs",
  description: "Real-time polling for twitter & bluesky",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">
              Polls App
            </Link>
            <nav className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/my-polls" className="text-sm hover:underline">
                    My Polls
                  </Link>
                  <Link href="/new" className="text-sm hover:underline">
                    Create Poll
                  </Link>
                  <UserButton user={user} />
                </>
              ) : (
                <LoginButton />
              )}
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
        <Toaster />
      </body>
    </html>
  );
}

