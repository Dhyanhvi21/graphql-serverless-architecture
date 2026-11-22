import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_ITEM } from '../graphql/mutations';
import { GET_ITEMS } from '../graphql/queries';
import { PlusCircle, Loader2 } from 'lucide-react';

export const ItemForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const [createItem, { loading, error }] = useMutation(CREATE_ITEM, {
    refetchQueries: [{ query: GET_ITEMS }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createItem({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
          },
        },
      });
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4">
        <PlusCircle className="w-5 h-5 text-indigo-400" />
        <h2 className="text-base font-semibold text-white">Create New Task / Item via GraphQL Mutation</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Set up RDS PostgreSQL Read Replica"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
          <input
            type="text"
            placeholder="Details, deployment commands, or notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
            Mutation Error: {error.message}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Execute Mutation
          </button>
        </div>
      </form>
    </div>
  );
};

