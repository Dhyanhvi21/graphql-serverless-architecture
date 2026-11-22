import React from 'react';
import { Navbar } from './components/Navbar';
import { MetricsDisplay } from './components/MetricsDisplay';
import { ItemForm } from './components/ItemForm';
import { ItemList } from './components/ItemList';
import { Layers } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Platform Overview Banner */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-800/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-semibold tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                Cloud Infrastructure Console
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">
                Serverless GraphQL Platform
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Integrated React frontend hosted on CloudFront with S3 Origin Access Control, backed by TypeScript AWS Lambda functions, private ECS Fargate tasks, and an isolated Multi-AZ RDS PostgreSQL database.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Layers className="w-4 h-4 text-indigo-400" /> Architecture Docs
              </a>
            </div>
          </div>
        </div>

        {/* Live Metrics Component */}
        <MetricsDisplay />

        {/* Mutation Form Component */}
        <ItemForm />

        {/* Query & Management Component */}
        <ItemList />
      </main>

      <footer className="border-t border-slate-800 py-6 bg-slate-950 text-center text-xs text-slate-500">
        <p>Cloud Platform Operations Console • AWS Serverless & ECS Fargate Architecture</p>
      </footer>
    </div>
  );
};

export default App;
