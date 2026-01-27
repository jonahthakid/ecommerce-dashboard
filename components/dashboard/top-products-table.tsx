'use client';

import { ClubCard } from '@/components/ui/club-card';
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
      label: 'Out',
      className: 'bg-[#fee2e2] text-[#ef4444] border-[#ef4444]'
    };
  }
  if (quantity < 10) {
    return {
      label: 'Low',
      className: 'bg-[#fef3c7] text-[#d97706] border-[#d97706]'
    };
  }
  return {
    label: 'OK',
    className: 'bg-[#d1fae5] text-[#059669] border-[#059669]'
  };
}

export function TopProductsTable({ products, loading }: TopProductsTableProps) {
  if (loading) {
    return (
      <ClubCard>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-2xl font-sans font-medium italic text-[#1e293b]">Merch</h3>
          <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Top Sellers</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full bg-[#1e293b]/10" />
          ))}
        </div>
      </ClubCard>
    );
  }

  return (
    <ClubCard>
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-2xl font-sans font-medium italic text-[#1e293b]">Merch</h3>
        <span className="font-mono text-xs font-bold text-[#ef4444] uppercase tracking-wider">Top Sellers</span>
      </div>
      {products.length === 0 ? (
        <p className="text-[#1e293b]/60 text-center py-8 font-mono uppercase text-sm">
          No product data available
        </p>
      ) : (
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-mono font-bold text-[#1e293b]/60 uppercase tracking-wider border-b-2 border-[#1e293b]">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Product</div>
            <div className="col-span-2 text-right">Sold</div>
            <div className="col-span-3 text-right">Stock</div>
          </div>

          {/* Rows */}
          {products.map((product, index) => {
            const status = getInventoryStatus(product.inventory_remaining);
            return (
              <div
                key={product.product_id}
                className="grid grid-cols-12 gap-2 px-3 py-3 border-b border-[#1e293b]/10 hover:bg-[#1e293b]/5 transition-colors group"
              >
                <div className="col-span-1 font-mono text-sm font-bold text-[#ef4444]">
                  {index + 1}
                </div>
                <div className="col-span-6 text-[#1e293b] font-bold truncate group-hover:text-[#ef4444] transition-colors text-sm">
                  {product.product_title}
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-[#1e293b]">
                  {product.quantity_sold}
                </div>
                <div className="col-span-3 text-right flex items-center justify-end gap-2">
                  <span className="font-mono text-sm text-[#1e293b]/60">
                    {product.inventory_remaining}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-mono font-bold uppercase border-2 ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ClubCard>
  );
}
