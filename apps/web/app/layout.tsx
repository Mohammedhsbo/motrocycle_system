import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MotorCycle | Premium Motorcycle Dealership",
    template: "%s | MotorCycle",
  },
  description: "Explore premium motorcycles, verified inventory, reservations, and dealership services.",
  openGraph: {
    title: "MotorCycle | Premium Motorcycle Dealership",
    description: "Find your next ride from verified motorcycle inventory.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
