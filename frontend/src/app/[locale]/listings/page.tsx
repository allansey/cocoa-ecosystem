'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Search, MapPin, Loader2, Sparkles, Award, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Listing {
  id: string;
  grade: string;
  quantityKg: number;
  priceGhsPerTonne: number;
  region: string;
  status: string;
  photo?: string;
  moistureLevel?: number;
  aiHealthScore?: number;
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
    <div className="min-h-screen bg-slate-50/60 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
              <ShieldCheck size={14} />
              <span>COCOBOD Grade Verified Marketplace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Cocoa Marketplace</h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
              Source verified single-origin cocoa bean batches directly from licensed Ghanaian farmers.
            </p>
          </div>
          
          <div className="w-full md:w-48 shrink-0">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Sort By</label>
            <select 
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 bg-white shadow-xs transition-all font-bold text-slate-800 text-xs appearance-none"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
        
        {/* Filter Controls */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Search Keywords</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Grade, region, farmer..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-amber-500 bg-slate-50 font-medium text-xs"
                />
                <Search className="absolute left-3 top-3 text-slate-400" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Region</label>
              <select 
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 bg-slate-50 font-medium text-xs appearance-none"
              >
                <option value="">All Ghana Regions</option>
                <option value="Ashanti">Ashanti</option>
                <option value="Western">Western</option>
                <option value="Western North">Western North</option>
                <option value="Eastern">Eastern</option>
                <option value="Central">Central</option>
                <option value="Greater Accra">Greater Accra</option>
                <option value="Volta">Volta</option>
                <option value="Oti">Oti</option>
                <option value="Bono">Bono</option>
                <option value="Bono East">Bono East</option>
                <option value="Ahafo">Ahafo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Min Price (GHS / Tonne)</label>
              <input 
                type="number" 
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 bg-slate-50 font-medium text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Max Price (GHS / Tonne)</label>
              <input 
                type="number" 
                placeholder="100,000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 bg-slate-50 font-medium text-xs"
              />
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-2">
            <Loader2 className="animate-spin text-amber-600" size={32} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading verified listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col items-center justify-center px-6">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No listings match your search</h3>
            <p className="text-slate-400 text-xs max-w-sm mb-4">
              Try adjusting your price range or region filters to explore available cocoa batches.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(listing => {
              const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
              const photoSrc = listing.photo?.startsWith('http') ? listing.photo : `${apiBase}${listing.photo}`;

              return (
                <div 
                  key={listing.id} 
                  className="bg-white rounded-2xl shadow-xs overflow-hidden border border-slate-200/80 hover:shadow-sm hover:border-amber-400 transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Card Photo Header */}
                    <div className="h-40 bg-gradient-to-br from-amber-100/70 to-amber-50 flex items-center justify-center relative border-b border-slate-100 overflow-hidden">
                      {listing.photo ? (
                        <img 
                          src={photoSrc} 
                          alt={`Cocoa ${listing.grade}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center">
                          <Award size={26} className="text-amber-400 mx-auto mb-1" />
                          <span className="text-amber-800/60 font-bold tracking-wider text-[11px] uppercase">Verified Cocoa</span>
                        </div>
                      )}
                      
                      <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-900 shadow-xs border border-slate-100">
                        {listing.grade}
                      </div>

                      {listing.status === 'SOLD' && (
                        <div className="absolute top-2.5 left-2.5 bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                          SOLD OUT
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5">
                      <div className="flex justify-between items-start mb-2.5">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity</span>
                          <h3 className="text-lg font-bold text-slate-900">{listing.quantityKg.toLocaleString()} <span className="text-xs text-slate-500 font-normal">kg</span></h3>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Price / Tonne</span>
                          <span className="text-base font-bold text-amber-700">{listing.priceGhsPerTonne.toLocaleString()} <span className="text-xs">GHS</span></span>
                        </div>
                      </div>

                      <div className="flex items-center text-slate-600 font-medium text-xs mb-1.5">
                        <MapPin size={13} className="mr-1 text-amber-600 shrink-0" /> 
                        <span>{listing.region} Region, Ghana</span>
                      </div>

                      <div className="flex items-center text-slate-500 text-xs mb-3">
                        <span>Farmer: <strong className="text-slate-800 font-medium">{listing.farmer?.name || 'Verified Grower'}</strong></span>
                      </div>

                      {/* Quality Passport Tags */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Moisture {listing.moistureLevel || 6.8}%
                        </span>
                        <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                          Health {listing.aiHealthScore || 99.2}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer CTA */}
                  <div className="p-4 sm:p-5 pt-0">
                    <Link 
                      href={`/${locale}/listings/${listing.id}`}
                      className="block w-full text-center bg-slate-900 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-xs active:scale-95"
                    >
                      View Quality Passport & Deal
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
