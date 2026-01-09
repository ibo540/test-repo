import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/components/game/SocketProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Regime Simulation",
    description: "Real-time Classroom Game",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <SocketProvider>
                    {children}
                </SocketProvider>
            </body>
        </html>
    );
}
