'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    return { label: 'Out of Stock', className: 'text-red-600 bg-red-50' };
  }
  if (quantity < 10) {
    return { label: 'Low Stock', className: 'text-orange-600 bg-orange-50' };
  }
  return { label: 'In Stock', className: 'text-green-600 bg-green-50' };
}

export function TopProductsTable({ products, loading }: TopProductsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No product data available
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Inventory</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => {
                const status = getInventoryStatus(product.inventory_remaining);
                return (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {product.product_title}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {product.quantity_sold}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.inventory_remaining}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
