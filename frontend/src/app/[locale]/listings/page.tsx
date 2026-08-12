'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Listing {
  id: string;
  grade: string;
  quantityKg: number;
  priceGhsPerTonne: number;
  region: string;
  status: string;
  farmer: {
    name: string;
  };
}

export default function ListingsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (regionFilter) params.append('region', regionFilter);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (sort && sort !== 'newest') params.append('sort', sort);
      
      const res = await api.get(`/listings?${params.toString()}`);
      const payload = res.data?.data ?? res.data;
      setListings(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to fetch listings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, regionFilter, minPrice, maxPrice, sort]);

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="flex flex-col gap-8 mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">{t('title')}</h2>
          
          <div className="w-full md:w-48">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Sort By</label>
            <select 
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-white shadow-sm transition-all font-medium appearance-none"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Search Keywords</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Grade or Region..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium"
                />
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Region</label>
              <select 
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium appearance-none"
              >
                <option value="">All Regions</option>
                <option value="Ashanti">Ashanti</option>
                <option value="Western">Western</option>
                <option value="Eastern">Eastern</option>
                <option value="Brong-Ahafo">Brong-Ahafo</option>
                <option value="Volta">Volta</option>
              </select>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Min Price (GHS)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Max Price (GHS)</label>
                <input 
                  type="number" 
                  placeholder="100,000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50 transition-all font-medium"
                />
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400 font-medium italic mt-2">
            Filters apply automatically as you type.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-amber-500" size={48} />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
            <Search size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Marketplace is Empty</h3>
          <p className="text-slate-500 text-lg font-medium max-w-md mb-8">
            No listings currently match your criteria. Try adjusting your filters, or be the first to post a new harvest!
          </p>
          <Link 
            href={`/${locale}/dashboard/create-listing`}
            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-full font-bold transition-colors shadow-lg shadow-amber-600/20"
          >
            Create a Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(listing => (
            <div key={listing.id} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-white hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="h-48 bg-gradient-to-tr from-amber-100 to-amber-50 flex items-center justify-center relative border-b border-amber-100/50 overflow-hidden">
                {listing.photo ? (
                  <img 
                    src={`http://localhost:5000${listing.photo}`} 
                    alt={`Cocoa ${listing.grade}`} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-amber-800/50 font-bold tracking-widest text-sm uppercase">No Photo</span>
                )}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-amber-700 shadow-sm border border-amber-100">
                  {listing.grade}
                </div>
                {listing.status === 'SOLD' && (
                  <div className="absolute top-3 left-3 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black shadow-sm">
                    SOLD
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-black text-slate-800">{listing.quantityKg} <span className="text-base text-slate-500 font-medium">kg</span></h3>
                  <div className="text-right">
                    <span className="text-xl font-black text-emerald-600 block">{listing.priceGhsPerTonne.toLocaleString()} GHS</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">Per Tonne</span>
                  </div>
                </div>
                <div className="flex items-center text-slate-600 font-medium text-sm mb-2">
                  <MapPin size={16} className="mr-2 text-amber-500" /> {listing.region}
                </div>
                <div className="flex items-center text-slate-500 text-xs mb-6">
                  <span>Listed by <strong className="text-slate-700">{listing.farmer?.name || 'Unknown'}</strong></span>
                </div>
                <Link 
                  href={`/${locale}/listings/${listing.id}`}
                  className="block w-full text-center bg-amber-100/50 hover:bg-amber-100 text-amber-800 font-bold py-3 rounded-xl transition-all border border-amber-200/50 hover:shadow-sm active:scale-[0.98]"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
