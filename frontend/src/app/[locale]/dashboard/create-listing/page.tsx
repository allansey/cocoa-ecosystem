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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

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
      const formData = new FormData();
      formData.append('grade', grade);
      formData.append('quantityKg', quantityKg);
      formData.append('priceGhsPerTonne', priceGhsPerTonne);
      formData.append('region', region);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      await api.post('/listings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
            <label className="block text-sm font-bold text-slate-700 mb-1">Upload Cocoa Images</label>
            <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              {photoPreview ? (
                <div className="flex flex-col items-center">
                  <img src={photoPreview} alt="Preview" className="h-32 rounded-lg object-cover mb-4" />
                  <p className="text-sm font-bold text-amber-600">Click or drag to change image</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  </div>
                  <h4 className="text-lg font-black text-slate-700">Drag & Drop images here</h4>
                  <p className="text-sm text-slate-500 font-medium mt-1">or click to browse from your device</p>
                  
                  <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 py-2 px-4 rounded-full mx-auto w-max border border-indigo-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    AI Auto-Grading ready upon upload
                  </div>
                </>
              )}
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
