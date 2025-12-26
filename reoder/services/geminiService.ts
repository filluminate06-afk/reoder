
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem } from "../types";

export async function analyzeInventoryWithAI(items: InventoryItem[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 분석 대상: 긴급 품목 + 판매 급증 품목
  const analysisTargets = items
    .filter(i => i.status === 'Critical' || i.salesGrowth > 30)
    .slice(0, 10);

  const context = JSON.stringify(analysisTargets.map(i => ({
    name: i.productName,
    stock: i.currentStock,
    currentWeekSales: i.currentWeekSales,
    lastWeekSales: i.lastWeekSales,
    growth: i.salesGrowth.toFixed(1) + '%',
    reorderPoint: i.reorderPoint,
    leadTime: i.leadTimeDays
  })));

  const prompt = `당신은 최고 수준의 SCM(Supply Chain Management) 컨설턴트입니다. 
  제공된 데이터는 긴급 재고 부족 또는 판매량이 급증하고 있는 품목들입니다. 
  
  데이터: ${context}
  
  분석 지침:
  1. 판매 성장률(growth)이 높은 품목은 재고가 있더라도 선제적 리오더를 권장하세요.
  2. 현재고가 리드타임 내 소진될 가능성이 높은 품목을 최우선순위(High)로 지정하세요.
  3. 구체적인 발주 수량과 비즈니스적 통찰력을 제공하세요.
  
  JSON 응답 형식:
  {
    "recommendations": [
      {
        "productName": "상품명",
        "priority": "High/Medium/Low",
        "suggestedQuantity": 100,
        "reason": "한글로 작성된 분석 사유 (예: 전주 대비 판매가 40% 급증하여 현 재고로는 3일 내 품절 예상)"
      }
    ],
    "generalInsights": "전체적인 공급망 리스크 요약 및 조언"
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                productName: { type: Type.STRING },
                priority: { type: Type.STRING },
                suggestedQuantity: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              }
            }
          },
          generalInsights: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text);
}
