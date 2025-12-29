import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Paper Plugin Villager Trade Guide",
  description: "Step-by-step guide to unlock all villager trades on Paper 1.21.1"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
