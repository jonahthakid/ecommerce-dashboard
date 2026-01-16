'use client';

import { GlassCard } from '@/components/ui/glass-card';
import { Skeleton } from '@/components/ui/skeleton';

interface TopProduct {
  product_id: string;
  product_title: string;
  quantity_sold: number;
  inventory_remaining: number;
}

interface TopProductsTableProps {
  products: TopProduct[];
  loading: boolean;
}

function getInventoryStatus(quantity: number): { label: string; className: string } {
  if (quantity <= 0) {
    return {
      label: 'Out of Stock',
      className: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    };
  }
  if (quantity < 10) {
    return {
      label: 'Low Stock',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };
  }
  return {
    label: 'In Stock',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };
}

export function TopProductsTable({ products, loading }: TopProductsTableProps) {
  if (loading) {
    return (
      <GlassCard>
        <h3 className="text-xl font-bold text-white mb-4">Top Selling Products</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full bg-white/5" />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h3 className="text-xl font-bold text-white mb-4">Top Selling Products</h3>
      {products.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No product data available
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs text-slate-500 uppercase tracking-wider border-b border-white/5">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Product</div>
            <div className="col-span-2 text-right">Sold</div>
            <div className="col-span-2 text-right">Stock</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {/* Rows */}
          {products.map((product, index) => {
            const status = getInventoryStatus(product.inventory_remaining);
            return (
              <div
                key={product.product_id}
                className="grid grid-cols-12 gap-4 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="col-span-1 text-slate-500 font-mono text-sm">
                  {index + 1}
                </div>
                <div className="col-span-5 text-white font-medium truncate group-hover:text-cyan-400 transition-colors">
                  {product.product_title}
                </div>
                <div className="col-span-2 text-right text-white font-semibold">
                  {product.quantity_sold}
                </div>
                <div className="col-span-2 text-right text-slate-400">
                  {product.inventory_remaining}
                </div>
                <div className="col-span-2 text-right">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
