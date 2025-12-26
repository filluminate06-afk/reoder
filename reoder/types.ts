
export interface InventoryItem {
  id: string;
  category: string;
  brand: string;
  productName: string;
  barcode: string;
  sku: string;
  currentStock: number; // AH열: 리오더 포함 총 재고
  inProductionStock: number; // AI열: 현재 생산/진행 중 재고
  safetyStock: number;
  reorderPoint: number;
  dailySalesAvg: number;
  currentWeekSales: number; // W열: 이번 주 판매
  lastWeekSales: number; // V열: 전주 판매
  leadTimeDays: number; 
  unitCost: number;
  status: 'Safe' | 'Warning' | 'Critical';
  salesGrowth: number; 
  expectedStockOutDate: string; // 예상 소진일
  suggestedOrderDate: string; // 권장 발주 기한
  itemType: string; // SKU 분석을 통한 품목 구분
  isSeasonalFit: boolean; // 현재 시즌 적합 여부 (바코드 index 3 기준)
}

export interface DashboardStats {
  totalItems: number;
  criticalCount: number;
  warningCount: number;
  safeCount: number;
  totalWeeklySales: number;
}

export enum ReorderStatus {
  SAFE = 'Safe',
  WARNING = 'Warning',
  CRITICAL = 'Critical'
}
