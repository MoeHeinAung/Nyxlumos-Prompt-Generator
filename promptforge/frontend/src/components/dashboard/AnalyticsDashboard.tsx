import { useEffect, useState } from "react";
import type { PieLabelRenderProps } from "recharts";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";
import HUDPanel from "../hud/HUDPanel";
import NeonText from "../hud/NeonText";
import { api } from "../../api/client";

const CYAN = "#00F0FF";
const MAGENTA = "#FF0055";
const AMBER = "#FFB800";
const COLORS = [CYAN, MAGENTA, AMBER, "#4ade80", "#a78bfa", "#fb923c", "#e0e7ff"];

const tooltipStyle = {
  background: "rgba(3, 5, 10, 0.95)",
  border: "1px solid rgba(0, 240, 255, 0.15)",
  borderRadius: 8,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
};

export default function AnalyticsDashboard() {
  const [sessions, setSessions] = useState<{ date: string; count: number }[]>([]);
  const [models, setModels] = useState<{ model: string; count: number }[]>([]);
  const [harnesses, setHarnesses] = useState<{ harness: string; enabled_count: number; pass_rate: number }[]>([]);
  const [complexity, setComplexity] = useState<{ score: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSessionAnalytics(30),
      api.getModelAnalytics(),
      api.getHarnessAnalytics(),
      api.getComplexityAnalytics(),
    ])
      .then(([s, m, h, c]) => {
        setSessions(s.daily_counts || []);
        setModels(m.model_usage || []);
        setHarnesses(h.harness_stats || []);
        setComplexity(c.distribution || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <span className="w-10 h-10 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
        <span className="text-cyan/50 font-orbitron text-xs tracking-wider animate-pulse">
          LOADING ANALYTICS...
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <NeonText as="h2" className="text-xl tracking-[0.15em]">ANALYTICS DASHBOARD</NeonText>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <HUDPanel>
          <p className="text-[9px] font-jetbrains text-cyan/30 uppercase tracking-[0.15em] mb-4">
            Session Trends (30 Days)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={sessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(0,240,255,0.25)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(0,240,255,0.25)", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: CYAN }} />
              <Line type="monotone" dataKey="count" stroke={CYAN} strokeWidth={2} dot={{ r: 2, fill: CYAN }} />
            </LineChart>
          </ResponsiveContainer>
        </HUDPanel>

        <HUDPanel>
          <p className="text-[9px] font-jetbrains text-cyan/30 uppercase tracking-[0.15em] mb-4">
            Model Usage Frequency
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={models}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.05)" />
              <XAxis dataKey="model" tick={{ fill: "rgba(0,240,255,0.25)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(0,240,255,0.25)", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={CYAN} radius={[6, 6, 0, 0]} fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </HUDPanel>

        <HUDPanel>
          <p className="text-[9px] font-jetbrains text-cyan/30 uppercase tracking-[0.15em] mb-4">
            Harness Distribution
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={harnesses}
                dataKey="enabled_count"
                nameKey="harness"
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={40}
                label={(props: PieLabelRenderProps) => String(props.name || "").split("_")[0]}
                labelLine={false}
              >
                {harnesses.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(3,5,10,0.8)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </HUDPanel>

        <HUDPanel>
          <p className="text-[9px] font-jetbrains text-cyan/30 uppercase tracking-[0.15em] mb-4">
            Complexity Distribution
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={complexity}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.05)" />
              <XAxis dataKey="score" tick={{ fill: "rgba(0,240,255,0.25)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(0,240,255,0.25)", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={MAGENTA} radius={[6, 6, 0, 0]} fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </HUDPanel>
      </div>
    </motion.div>
  );
}
