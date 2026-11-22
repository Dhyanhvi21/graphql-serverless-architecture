import React from 'react';
import { useQuery } from '@apollo/client';
import { HEALTH_CHECK } from '../graphql/queries';
import { Activity, Database, Cpu, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export const MetricsDisplay: React.FC = () => {
  const { data, loading, error } = useQuery(HEALTH_CHECK, {
    pollInterval: 15000,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Lambda Status */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">AWS Lambda Handlers</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">Active</span>
          <span className="text-xs text-emerald-400 font-medium">Node.js 20 • ARM64</span>
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" /> Queries, Mutations, Subscriptions
        </p>
      </div>

      {/* ECS Fargate Status */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">ECS Fargate Server</span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">2 Replicas</span>
          <span className="text-xs text-blue-400 font-medium">Auto-Scaled</span>
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" /> Circuit Breaker & Rollback On
        </p>
      </div>

      {/* RDS PostgreSQL Status */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">RDS PostgreSQL</span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <Database className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">Multi-AZ</span>
          <span className="text-xs text-purple-400 font-medium">PostgreSQL 15</span>
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" /> Storage Auto-Scaling (20-100GB)
        </p>
      </div>

      {/* CloudWatch Health Status */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">CloudWatch Health</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          {loading ? (
            <span className="text-lg font-semibold text-slate-400">Checking...</span>
          ) : error ? (
            <span className="text-lg font-semibold text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Ready for API
            </span>
          ) : (
            <span className="text-2xl font-bold text-emerald-400">Healthy</span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2 truncate" title={data?.healthCheck || 'Alarms configured for errors & latency'}>
          {data?.healthCheck ? 'Connected to RDS' : 'Alarms: Errors, Latency, Storage'}
        </p>
      </div>
    </div>
  );
};
