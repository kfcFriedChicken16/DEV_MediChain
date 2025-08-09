'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import Button from '@/components/ui/Button';
import { useMedicalRegistry } from '@/lib/hooks';
import { useRouter } from 'next/navigation';

interface PatientRow {
  address: string;
  hasAccess: boolean;
  lastAccess?: string;
  displayName?: string;
}

export default function ProviderPatients() {
  const { isConnected, account, userType } = useWallet();
  const { hasAccess, contract } = useMedicalRegistry();
  const router = useRouter();

  const [activePatients, setActivePatients] = useState<PatientRow[]>([]);
  const [needsGrantPatients, setNeedsGrantPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const canShow = useMemo(() => isConnected && userType === 'provider' && !!account, [isConnected, userType, account]);

  // Build lists from events + live state
  const loadPatients = async () => {
    if (!canShow || !contract || !account) return;

    try {
      setLoading(true);

      // Query all AccessGranted events for this provider (doctor)
      const filter = contract.filters.AccessGranted(null, account);
      const events = await contract.queryFilter(filter);

      // Map patient -> last access timestamp
      const patientMap = new Map<string, number>();
      for (const ev of events) {
        const patientAddr: string | undefined = ev.args?.patient;
        if (!patientAddr) continue;
        let ts = 0;
        try {
          const block = await contract.provider.getBlock(ev.blockNumber);
          ts = block?.timestamp ? block.timestamp : 0;
        } catch {}
        const prev = patientMap.get(patientAddr.toLowerCase()) ?? 0;
        if (ts > prev) patientMap.set(patientAddr.toLowerCase(), ts);
      }

      const actives: PatientRow[] = [];
      const needs: PatientRow[] = [];

      // Evaluate current access flag per patient
      for (const [patientLower, ts] of patientMap.entries()) {
        const patientAddr = patientLower;
        let has = false;
        try {
          has = await hasAccess(patientAddr, account);
        } catch (e) {
          // ignore; default false
        }
        const name = `${patientAddr.substring(0,6)}...${patientAddr.substring(patientAddr.length-4)}`;
        const last = ts ? new Date(ts * 1000).toLocaleString() : undefined;
        const row: PatientRow = { address: patientAddr, hasAccess: has, lastAccess: last, displayName: name };
        (has ? actives : needs).push(row);
      }

      // Sort newest first
      const byTsDesc = (a: PatientRow, b: PatientRow) => {
        const ta = a.lastAccess ? Date.parse(a.lastAccess) : 0;
        const tb = b.lastAccess ? Date.parse(b.lastAccess) : 0;
        return tb - ta;
      };
      setActivePatients(actives.sort(byTsDesc));
      setNeedsGrantPatients(needs.sort(byTsDesc));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [canShow, contract, account]);

  // Live refresh on grant/revoke
  useEffect(() => {
    if (!contract || !account) return;
    const grantF = contract.filters.AccessGranted(null, account);
    const revokeF = contract.filters.AccessRevoked(null, account);
    const onChange = () => loadPatients();
    contract.on(grantF, onChange);
    contract.on(revokeF, onChange);
    return () => {
      contract.off(grantF, onChange);
      contract.off(revokeF, onChange);
    };
  }, [contract, account]);

  // Redirect if not connected or not a provider
  if (!isConnected || userType !== 'provider') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Access Denied</h2>
          <p className="mb-6 text-yellow-700">
            You must be connected as a healthcare provider to view this page.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Patient Management</h1>

      <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Your Patients</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Patients who have granted you access (or previously granted) to their medical records.
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={loadPatients} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button onClick={() => router.push('/provider/requests')}>Request Access</Button>
          </div>
        </div>

        <div className="border-t border-gray-200">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">Loading patients...</p>
            </div>
          ) : (
            <div className="p-4 space-y-10">
              <section>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Active (can add records now)</h3>
                {activePatients.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Grant</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activePatients.map((p, idx) => (
                        <tr key={`active-${idx}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.displayName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.lastAccess || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <a href={`/provider/records/${p.address}`} className="text-blue-600 hover:text-blue-900">View Records</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500">No active patients at the moment.</p>
                )}
              </section>

              <section>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Previously authorized (needs patient to grant again)</h3>
                {needsGrantPatients.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Grant</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {needsGrantPatients.map((p, idx) => (
                        <tr key={`need-${idx}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.displayName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.lastAccess || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button onClick={() => router.push(`/provider/requests?patient=${p.address}`)} className="text-green-600 hover:text-green-900">Request Access</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500">No patients need re‑grant right now.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}