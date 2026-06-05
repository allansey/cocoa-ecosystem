'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateListingPage({ params: { locale } }: { params: { locale: string } }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [grade, setGrade] = useState('Grade A');
  const [quantityKg, setQuantityKg] = useState('');
  const [priceGhsPerTonne, setPriceGhsPerTonne] = useState('');
  const [region, setRegion] = useState('Ashanti');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'FARMER') {
      router.push(`/${locale}/dashboard`);
    }
  }, [isAuthenticated, user, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/listings', {
        grade,
        quantityKg: Number(quantityKg),
        priceGhsPerTonne: Number(priceGhsPerTonne),
        region,
        photo: "" // mock photo
      });
      router.push(`/${locale}/dashboard`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'FARMER') return null;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-amber-600 hover:text-amber-800 mb-6 font-bold">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <h2 className="text-3xl font-black text-amber-900 mb-6">Create New Listing</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 font-bold">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Cocoa Grade</label>
            <select 
              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
              value={grade} onChange={e => setGrade(e.target.value)}
            >
              <option value="Grade A">Grade A (Premium)</option>
              <option value="Grade B">Grade B (Standard)</option>
              <option value="Grade C">Grade C (Sub-standard)</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Quantity (kg)</label>
              <input 
                type="number" 
                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 shadow-sm"
                value={quantityKg} onChange={e => setQuantityKg(e.target.value)} required min="50"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Price (GHS / Tonne)</label>
              <input 
                type="number" 
                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 shadow-sm"
                value={priceGhsPerTonne} onChange={e => setPriceGhsPerTonne(e.target.value)} required min="1000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Region</label>
            <select 
              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
              value={region} onChange={e => setRegion(e.target.value)}
            >
              <option value="Ashanti">Ashanti Region</option>
              <option value="Western">Western Region</option>
              <option value="Eastern">Eastern Region</option>
              <option value="Brong-Ahafo">Brong-Ahafo Region</option>
              <option value="Volta">Volta Region</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-xl mt-4 shadow-lg shadow-amber-600/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
