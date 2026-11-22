import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ITEMS } from '../graphql/queries';
import { UPDATE_ITEM, DELETE_ITEM } from '../graphql/mutations';
import { Trash2, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export const ItemList: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const { data, loading, error, refetch } = useQuery(GET_ITEMS, {
    variables: selectedStatus === 'ALL' ? {} : { status: selectedStatus },
    fetchPolicy: 'cache-and-network',
  });

  const [updateItem] = useMutation(UPDATE_ITEM, {
    refetchQueries: [{ query: GET_ITEMS }],
  });

  const [deleteItem] = useMutation(DELETE_ITEM, {
    refetchQueries: [{ query: GET_ITEMS }],
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateItem({
        variables: {
          input: {
            id,
            status: newStatus,
          },
        },
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteItem({ variables: { id } });
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const items = data?.getItems || [];

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-semibold text-white">Managed Items (RDS PostgreSQL)</h2>
          <p className="text-xs text-slate-400">Queried via GraphQL Query Handler</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition"
            title="Refetch data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading items from GraphQL backend...</div>
      ) : error ? (
        <div className="py-8 text-center text-rose-400 text-sm bg-rose-500/10 rounded-lg border border-rose-500/20">
          Backend not yet reached ({error.message}). Start local backend or deploy AWS stack.
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          No items found. Create your first item above!
        </div>
      ) : (
        <div className="divide-y divide-slate-700/60">
          {items.map((item: any) => (
            <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-white">{item.title}</h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.priority === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400'
                        : item.priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400'
                        : item.priority === 'LOW'
                        ? 'bg-slate-500/20 text-slate-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
                {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                <div className="text-[11px] text-slate-500 flex items-center gap-3">
                  <span>ID: {item.id.slice(0, 8)}...</span>
                  {item.createdAt && <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(item.id, e.target.value)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium focus:outline-none ${
                    item.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : item.status === 'IN_PROGRESS'
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      : 'bg-slate-700/40 border-slate-600 text-slate-300'
                  }`}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

