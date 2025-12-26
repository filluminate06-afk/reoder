
import { InventoryItem, ReorderStatus } from '../types';

const SHEET_ID = '1SYEeF3rhmrmJAp1xGKb8pN-qZpaGqpat3fuIw1IGJ3c';
const GID = '0'; 
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

/**
 * 바코드(품번) 15자리 체계 분석
 * Index 3: 계절 (S:봄, U:여름, F:가을, W:겨울, C:캐리오버, A:올시즌, O:콜라보)
 */
function analyzeSkuMetadata(sku: string): { type: string, leadTime: number, isSeasonalFit: boolean } {
  if (!sku || sku.length < 7) return { type: '일반', leadTime: 14, isSeasonalFit: true };

  const seasonCode = sku.substring(3, 4).toUpperCase();
  const subCategoryCode = sku.substring(5, 7).toUpperCase();
  
  // 현재 월 기준 시즌 판별
  const month = new Date().getMonth() + 1;
  let currentSeasonCodes: string[] = ['A', 'C', 'O']; // 올시즌, 캐리오버, 콜라보는 항상 적합
  
  if (month >= 2 && month <= 4) currentSeasonCodes.push('S'); // 봄
  else if (month >= 5 && month <= 7) currentSeasonCodes.push('U'); // 여름
  else if (month >= 8 && month <= 10) currentSeasonCodes.push('F'); // 가을
  else currentSeasonCodes.push('W'); // 겨울 (11, 12, 1)

  const isSeasonalFit = currentSeasonCodes.includes(seasonCode);

  // 리드타임 결정
  let leadTime = 21;
  let type = '일반';

  if (subCategoryCode === 'DW' || subCategoryCode === 'DV') {
    type = '패딩';
    leadTime = 50;
  } else if (['CT', 'JP', 'JK', 'WB', 'TJ', 'VT', 'AR', 'CD'].includes(subCategoryCode)) {
    type = '아우터';
    leadTime = 35;
  }

  return { type, leadTime, isSeasonalFit };
}

export async function fetchInventoryData(): Promise<InventoryItem[]> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error('데이터를 가져오는데 실패했습니다.');
    const csvText = await response.text();
    
    const rows = csvText.split('\n').map(row => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });

    let lastKnownProductName = '';
    let lastKnownBrand = '';
    let lastKnownCategory = '';

    const items: InventoryItem[] = rows.slice(1)
      .filter(row => row.length > 33)
      .map((row, idx) => {
        const rawProductName = row[12];
        if (rawProductName && rawProductName !== '') lastKnownProductName = rawProductName;
        const rawBrand = row[2];
        if (rawBrand && rawBrand !== '') lastKnownBrand = rawBrand;
        const rawCategory = row[1];
        if (rawCategory && rawCategory !== '') lastKnownCategory = rawCategory;

        const sku = row[3] || '';
        const { type: itemType, leadTime: dynamicLeadTime, isSeasonalFit } = analyzeSkuMetadata(sku);

        const currentStock = parseInt(row[33]) || 0; 
        const inProductionStock = parseInt(row[34]) || 0; 
        const reorderPoint = parseInt(row[7]) || 10;
        const currentWeekSales = parseInt(row[22]) || 0; 
        const lastWeekSales = parseInt(row[21]) || 0; 
        
        const dailySales = currentWeekSales / 7;
        const salesGrowth = lastWeekSales === 0 ? (currentWeekSales > 0 ? 100 : 0) : ((currentWeekSales - lastWeekSales) / lastWeekSales) * 100;

        const daysToStockOut = dailySales > 0 ? Math.floor(currentStock / dailySales) : 365;
        const today = new Date();
        const stockOutDate = new Date();
        stockOutDate.setDate(today.getDate() + daysToStockOut);

        const suggestedOrder = new Date(stockOutDate);
        suggestedOrder.setDate(suggestedOrder.getDate() - dynamicLeadTime);

        let status: ReorderStatus = ReorderStatus.SAFE;
        if (currentStock <= reorderPoint * 0.5 || daysToStockOut <= 10) status = ReorderStatus.CRITICAL;
        else if (currentStock <= reorderPoint || daysToStockOut <= 20) status = ReorderStatus.WARNING;

        return {
          id: `row-${idx}`,
          category: lastKnownCategory || '기타',
          brand: lastKnownBrand || '브랜드',
          productName: lastKnownProductName || '알 수 없는 상품',
          barcode: row[4] || 'N/A',
          sku,
          currentStock,
          inProductionStock,
          safetyStock: parseInt(row[6]) || 5,
          reorderPoint,
          dailySalesAvg: parseFloat(dailySales.toFixed(1)),
          currentWeekSales,
          lastWeekSales,
          leadTimeDays: dynamicLeadTime,
          unitCost: parseInt(row[10]) || 0,
          status,
          salesGrowth,
          expectedStockOutDate: daysToStockOut > 360 ? '안정적' : stockOutDate.toLocaleDateString('ko-KR'),
          suggestedOrderDate: daysToStockOut > 360 ? '해당없음' : suggestedOrder.toLocaleDateString('ko-KR'),
          itemType,
          isSeasonalFit
        };
      })
      .filter(item => item.productName !== '알 수 없는 상품');

    return items;
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    return generateMockData();
  }
}

function generateMockData(): InventoryItem[] {
  return Array.from({ length: 50 }).map((_, i) => {
    const isPadding = i % 8 === 0;
    const sku = isPadding ? `FBEWODW00${i}BK00M` : `FBESUTS00${i}WH00L`;
    const { type: itemType, leadTime, isSeasonalFit } = analyzeSkuMetadata(sku);
    
    const cSales = Math.floor(Math.random() * 200) + 20;
    const lSales = Math.floor(cSales * (0.6 + Math.random() * 0.8));
    const stock = Math.floor(Math.random() * 100);
    const inProd = Math.floor(Math.random() * 40);
    const dailySales = cSales / 7;
    const daysToStockOut = Math.floor(stock / (dailySales || 1));
    
    const d1 = new Date(); d1.setDate(d1.getDate() + daysToStockOut);
    const d3 = new Date(d1); d3.setDate(d3.getDate() - leadTime);

    return {
      id: `mock-${i}`,
      category: isPadding ? '아우터' : '상의',
      brand: 'FILLUMINATE',
      productName: isPadding ? `필루미네이트 프리미엄 덕다운 패딩 ${i}` : `필루미네이트 베이직 티셔츠 ${i}`,
      barcode: `880912345${i}`,
      sku,
      currentStock: stock,
      inProductionStock: inProd,
      safetyStock: 10,
      reorderPoint: 40,
      dailySalesAvg: parseFloat(dailySales.toFixed(1)),
      currentWeekSales: cSales,
      lastWeekSales: lSales,
      leadTimeDays: leadTime,
      unitCost: 45000,
      status: stock < 25 ? ReorderStatus.CRITICAL : stock < 50 ? ReorderStatus.WARNING : ReorderStatus.SAFE,
      salesGrowth: lSales === 0 ? 100 : ((cSales - lSales) / lSales) * 100,
      expectedStockOutDate: daysToStockOut > 360 ? '안정적' : d1.toLocaleDateString('ko-KR'),
      suggestedOrderDate: daysToStockOut > 360 ? '해당없음' : d3.toLocaleDateString('ko-KR'),
      itemType,
      isSeasonalFit
    };
  });
}
