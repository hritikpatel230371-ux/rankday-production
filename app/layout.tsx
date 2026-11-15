import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { appConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: appConfig.name,
  description: "AI personal rank and productivity command center"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
