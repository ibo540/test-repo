"use client"

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AppShellProps {
    children: React.ReactNode;
    className?: string;
    header?: React.ReactNode;
}

export function AppShell({ children, className, header }: AppShellProps) {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent selection:text-white">
            {header}
            <motion.main
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn("flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full", className)}
            >
                {children}
            </motion.main>
        </div>
    );
}
