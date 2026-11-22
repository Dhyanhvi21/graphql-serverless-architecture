import React from 'react';
import { Cloud, ShieldCheck, Database, Server, Activity } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Operations Platform</h1>
            <p className="text-xs text-slate-400">Serverless GraphQL & AWS Infrastructure</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            CloudFront + OAC
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Server className="w-3.5 h-3.5" />
            ECS Fargate
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Database className="w-3.5 h-3.5" />
            RDS Multi-AZ
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>KMS Secured</span>
          </div>
        </div>
      </div>
    </header>
  );
};
