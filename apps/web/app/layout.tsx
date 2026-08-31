import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: " مؤسسه أولاد غانم | Awlad Ghanem Motorcycles",
    template: "%s | مؤسسه أولاد غانم",
  },
  description: "Awlad Ghanem Motorcycles: browse motorcycles, reserve your choice, and apply for installments in EGP.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "مؤسسه أولاد غانم | Awlad Ghanem Motorcycles",
    description: "Find your next motorcycle from verified live inventory.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
