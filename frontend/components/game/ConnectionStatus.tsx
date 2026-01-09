"use client"

import { useSocket } from "./SocketProvider";
import { Badge } from "@/components/ui/badge";

export function ConnectionStatus() {
    const { isConnected } = useSocket() || {};

    if (isConnected) {
        return <Badge variant="success" className="animate-pulse">Connected</Badge>;
    }

    return <Badge variant="destructive">Disconnected</Badge>;
}
