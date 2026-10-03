import { Product, Category } from '@prisma/client';

export type PlainProduct = Omit<Product, 'purchasePrice' | 'sellingPrice'> & {
  purchasePrice: number;
  sellingPrice: number;
  category?: Category | null;
};

export function serializeProduct<T extends { purchasePrice: unknown; sellingPrice: unknown }>(
  product: T
): Omit<T, 'purchasePrice' | 'sellingPrice'> & { purchasePrice: number; sellingPrice: number } {
  return {
    ...product,
    purchasePrice: Number(product.purchasePrice),
    sellingPrice: Number(product.sellingPrice),
  };
}

export function serializeProducts<T extends { purchasePrice: unknown; sellingPrice: unknown }>(
  products: T[]
) {
  return products.map((p) => serializeProduct(p));
}
