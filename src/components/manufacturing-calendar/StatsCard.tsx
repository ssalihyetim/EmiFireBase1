import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface CalendarStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export function CalendarStatsCard({ title, value, icon: Icon, color }: CalendarStatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
} 