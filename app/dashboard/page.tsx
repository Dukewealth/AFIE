'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Clock, 
  TrendingUp, 
  Eye, 
  X,
  CreditCard,
  Smartphone
} from 'lucide-react';

interface Transaction {
  id: string;
  external_tx_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  ip_address: string;
  country_code: string;
  status: 'ALLOWED' | 'CHALLENGED' | 'BLOCK' | 'BLOCKED';
  risk_score: number;
  decision_reason: string;
  latency_ms: number;
  created_at: string;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    external_tx_id: 'tx_98124',
    user_id: 'usr_8821',
    amount: 1250.00,
    currency: 'USD',
    payment_method: 'card',
    ip_address: '102.176.45.12',
    country_code: 'GH',
    status: 'BLOCKED',
    risk_score: 94,
    decision_reason: 'High velocity attack: 5 rapid authorization attempts within 60 seconds from same device fingerprint.',
    latency_ms: 54,
    created_at: new Date(Date.now() - 1000 * 30).toISOString()
  },
  {
    id: '2',
    external_tx_id: 'tx_98123',
    user_id: 'usr_4401',
    amount: 450.00,
    currency: 'USD',
    payment_method: 'momo',
    ip_address: '154.160.22.8',
    country_code: 'GH',
    status: 'CHALLENGED',
    risk_score: 58,
    decision_reason: 'Unusual amount deviation: Transaction is 4.2x above historical 30-day user median. Step-up OTP triggered.',
    latency_ms: 220,
    created_at: new Date(Date.now() - 1000 * 90).toISOString()
  },
  {
    id: '3',
    external_tx_id: 'tx_98122',
    user_id: 'usr_1092',
    amount: 35.00,
    currency: 'USD',
    payment_method: 'card',
    ip_address: '197.251.14.90',
    country_code: 'GH',
    status: 'ALLOWED',
    risk_score: 12,
    decision_reason: 'Legitimate transaction: Clean device reputation, standard velocity, consistent geolocation.',
    latency_ms: 18,
    created_at: new Date(Date.now() - 1000 * 180).toISOString()
  }
];

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Poll for live transactions if backend API exists
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('/api/v1/transactions');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setTransactions(data);
          }
        }
      } catch (err) {
        // Fallback to local state if backend route is still spinning up
      }
    };

    const interval = setInterval(fetchTransactions, 2500);
    return () => clearInterval(interval);
  }, []);

  const totalEvaluated = transactions.length;
  const blockedCount = transactions.filter(t => t.status === 'BLOCKED' || t.status === 'BLOCK').length;
  const blockRate = totalEvaluated > 0 ? ((blockedCount / totalEvaluated) * 100).toFixed(1) : '0.0';
  const avgLatency = totalEvaluated > 0 
    ? Math.round(transactions.reduce((acc, t) => acc + (t.latency_ms || 0), 0) / totalEvaluated)
    : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-neutral-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight">AFIE Autonomous Fraud Engine</h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">Real-Time Risk Operations & Autonomous Decision Stream</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-xs rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
            Engine Status: <strong className="text-emerald-400">Autonomous Active</strong>
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs uppercase font-semibold">Total Evaluated</span>
            <Activity className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold mt-2">{totalEvaluated}</div>
          <span className="text-xs text-neutral-500">Last 24 hours</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs uppercase font-semibold">Autonomous Block Rate</span>
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-red-400">{blockRate}%</div>
          <span className="text-xs text-neutral-500">{blockedCount} malicious transactions rejected</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs uppercase font-semibold">Avg Latency</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-blue-400">{avgLatency} ms</div>
          <span className="text-xs text-neutral-500">Heuristic + AI Agent path</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs uppercase font-semibold">System Threat Level</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-amber-400">
            {Number(blockRate) > 20 ? 'Elevated' : 'Guarded'}
          </div>
          <span className="text-xs text-neutral-500">Autonomous friction active</span>
        </div>
      </div>

      {/* Live Transaction Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide uppercase text-neutral-300">
            Live Transaction Stream
          </h2>
          <span className="text-xs text-neutral-500">Auto-refreshing</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950/50 text-neutral-400 text-xs uppercase border-b border-neutral-800">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Transaction ID</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Risk Score</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Latency</th>
                <th className="px-6 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {transactions.map((tx) => {
                const isBlocked = tx.status === 'BLOCKED' || tx.status === 'BLOCK';
                const isChallenged = tx.status === 'CHALLENGED';
                const isAllowed = tx.status === 'ALLOWED';

                return (
                  <tr key={tx.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 text-xs text-neutral-400 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{tx.external_tx_id}</td>
                    <td className="px-6 py-4 text-neutral-300">{tx.user_id}</td>
                    <td className="px-6 py-4 font-semibold">
                      ${Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                        {tx.payment_method === 'momo' ? (
                          <Smartphone className="h-3.5 w-3.5 text-yellow-400" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 text-blue-400" />
                        )}
                        {tx.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        tx.risk_score >= 70 ? 'bg-red-950 text-red-400 border border-red-800' :
                        tx.risk_score >= 30 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {tx.risk_score}/100
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isBlocked && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <ShieldAlert className="h-3 w-3" /> BLOCKED
                        </span>
                      )}
                      {isChallenged && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="h-3 w-3" /> CHALLENGED
                        </span>
                      )}
                      {isAllowed && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="h-3 w-3" /> ALLOWED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-400">
                      {tx.latency_ms} ms
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedTx(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded transition-colors"
                      >
                        <Eye className="h-3 w-3" /> Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Deep Dive Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-neutral-400" />
                <h3 className="font-semibold text-base">Forensic Case Audit</h3>
              </div>
              <button 
                onClick={() => setSelectedTx(null)}
                className="text-neutral-400 hover:text-neutral-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                <div>
                  <span className="text-xs text-neutral-500">Transaction ID</span>
                  <div className="font-mono text-xs mt-0.5">{selectedTx.external_tx_id}</div>
                </div>
                <div>
                  <span className="text-xs text-neutral-500">Origin IP & Country</span>
                  <div className="text-xs mt-0.5">{selectedTx.ip_address} ({selectedTx.country_code})</div>
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-semibold text-neutral-400">Autonomous Decision Reasoning</span>
                <div className="mt-1 p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-neutral-200 text-xs leading-relaxed">
                  {selectedTx.decision_reason}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                  <span className="text-xs text-neutral-500 block">Status</span>
                  <strong className="text-xs text-neutral-200 mt-1 block">{selectedTx.status}</strong>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                  <span className="text-xs text-neutral-500 block">Risk Score</span>
                  <strong className="text-xs text-red-400 mt-1 block">{selectedTx.risk_score}/100</strong>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800">
                  <span className="text-xs text-neutral-500 block">Latency</span>
                  <strong className="text-xs text-blue-400 mt-1 block">{selectedTx.latency_ms} ms</strong>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button 
                onClick={() => setSelectedTx(null)}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}