"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_TOOLTIP_STYLE } from "@/components/dashboard/chart-theme";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TrendPoint } from "@/lib/types";

const LINE_COLOR = "#0a8d56";

/** Weekly footprint trend line; empty state until a few receipts exist. */
export function TrendsCard({ trends }: { trends: TrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Footprint trend</CardTitle>
        <CardDescription>CO₂e per period</CardDescription>
      </CardHeader>
      <CardContent>
        {trends.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Upload a few receipts to see your trend.
          </p>
        ) : (
          <div
            className="h-[160px]"
            role="img"
            aria-label={
              "Footprint trend over " +
              trends.length +
              " periods, from " +
              (trends[0]?.co2eKg.toFixed(1) ?? "0") +
              " to " +
              (trends[trends.length - 1]?.co2eKg.toFixed(1) ?? "0") +
              " kg CO₂e."
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trends}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)} kg`, "CO₂e"]}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Line
                  type="monotone"
                  dataKey="co2eKg"
                  stroke={LINE_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: LINE_COLOR }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
