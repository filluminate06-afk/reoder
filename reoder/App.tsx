
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, Package, AlertTriangle, TrendingUp, 
  RefreshCcw, BrainCircuit, Search, Filter, ExternalLink,
  ArrowUpRight, ArrowDownRight, Activity, Calendar, 
  Clock, Truck, Barcode, Boxes, Crown, Timer, Info, Zap,
  AlertOctagon, ShoppingCart, Coins, TrendingDown, Flame,
  Target, Download, CheckCircle2, History
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { InventoryItem, ReorderStatus } from './types';
import { fetchInventoryData } from './services/googleSheetsService';
import { analyzeInventoryWithAI } from './services/geminiService';

const App: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // 실무용: 발주 처리된 아이템 기록 (상용화 시 DB 연동 필요, 현재는 로컬스토리지)
  const [orderedItems, setOrderedItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('ordered_items_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const data = await fetchInventoryData();
    setInventory(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem('ordered_items_v1', JSON.stringify(orderedItems));
  }, [orderedItems]);

  const toggleOrder = (id: string) => {
    setOrderedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // CSV 내보내기 기능 (상용화 필수 기능)
  const exportToCSV = () => {
    const headers = ['제품명', '바코드', 'SKU', '현재고(AH)', '생산중(AI)', '주간판매(W)', '성장률', '예상소진일'];
    const rows = inventory.map(i => [
      i.productName, i.barcode, i.sku, i.currentStock, i.inProductionStock, i.currentWeekSales, i.salesGrowth.toFixed(1) + '%', i.expectedStockOutDate
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `리오더_보고서_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const topSellers = useMemo(() => {
    return [...inventory]
      .sort((a, b) => b.currentWeekSales - a.currentWeekSales)
      .slice(0, 20);
  }, [inventory]);

  const urgentReorders = useMemo(() => {
    return [...inventory]
      .filter(item => item.currentWeekSales > 0 && item.isSeasonalFit && !orderedItems.includes(item.id))
      .sort((a, b) => {
        const scoreA = (Math.pow(a.currentWeekSales, 1.5) / (a.currentStock + 0.5)) * (a.isSeasonalFit ? 1.5 : 1);
        const scoreB = (Math.pow(b.currentWeekSales, 1.5) / (b.currentStock + 0.5)) * (b.isSeasonalFit ? 1.5 : 1);
        return scoreB - scoreA;
      })
      .slice(0, 20);
  }, [inventory, orderedItems]);

  const filteredItems = inventory.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.productName.toLowerCase().includes(term) || 
      item.sku.toLowerCase().includes(term) ||
      item.barcode.toLowerCase().includes(term) ||
      item.brand.toLowerCase().includes(term)
    ) && (filterStatus === 'All' || item.status === filterStatus);
  });

  const stats = useMemo(() => ({
    total: inventory.length,
    critical: inventory.filter(i => i.status === ReorderStatus.CRITICAL && !orderedItems.includes(i.id)).length,
    totalWeeklySales: inventory.reduce((acc, i) => acc + i.currentWeekSales, 0),
    orderedCount: orderedItems.length
  }), [inventory, orderedItems]);

  const runAIAnalysis = async () => {
    if (inventory.length === 0) return;
    setIsAnalyzing(true);
    try {
      const insights = await analyzeInventoryWithAI(inventory);
      setAiInsights(insights);
    } catch (err) {
      console.error("AI 분석 오류", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
          <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 w-10 h-10 animate-pulse" />
        </div>
        <p className="mt-12 text-slate-400 font-black text-xl tracking-widest animate-pulse uppercase">Enterprise Intelligence Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-['Pretendard']">
      <nav className="bg-white/95 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-tr from-slate-900 to-slate-700 p-3 rounded-2xl shadow-xl">
            <LayoutDashboard className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="font-black text-2xl text-slate-900 tracking-tight leading-none uppercase">Reorder Expert Pro <span className="text-indigo-600 font-black ml-1">2025</span></h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Enterprise Data Pipeline Active</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all border border-slate-200">
            <Download className="w-4 h-4" />
            <span>보고서 추출</span>
          </button>
          <button onClick={loadData} disabled={refreshing} className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>동기화</span>
          </button>
          <a href={`https://docs.google.com/spreadsheets/d/1SYEeF3rhmrmJAp1xGKb8pN-qZpaGqpat3fuIw1IGJ3c/edit`} target="_blank" className="flex items-center gap-2 px-6 py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all shadow-lg shadow-indigo-100">
            <ExternalLink className="w-4 h-4" />
            <span>마스터 시트</span>
          </a>
        </div>
      </nav>

      <main className="max-w-[1780px] mx-auto px-8 pt-10 space-y-12">
        {/* KPI 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCard title="Total SKU" value={stats.total} sub="운영 품목 전체" color="blue" icon={<Package />} />
          <StatCard title="Weekly Sales" value={stats.totalWeeklySales} sub="주간 판매 합계" color="indigo" icon={<TrendingUp />} />
          <StatCard title="Pending Risk" value={stats.critical} sub="조치 필요 리스크" color="red" isAlert icon={<AlertOctagon />} />
          <StatCard title="Action Completed" value={stats.orderedCount} sub="금일 발주 처리" color="emerald" icon={<CheckCircle2 />} />
        </div>

        {/* 긴급 리오더 섹션 - 최우선 노출 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-4">
              <div className="bg-rose-600 p-2.5 rounded-xl shadow-lg shadow-rose-100">
                <Flame className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Urgent Stock-Out Risk</h2>
                <p className="text-slate-400 text-sm font-bold tracking-tight">절대 판매량 대비 재고 부족분 기준 정렬 (기회 손실 방지)</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm text-xs font-black text-slate-500 uppercase">
               <History className="w-4 h-4" /> 최근 {stats.orderedCount}개 항목 발주 완료됨
            </div>
          </div>
          <div className="flex overflow-x-auto pb-10 gap-8 no-scrollbar -mx-2 px-2 scroll-smooth">
            {urgentReorders.length > 0 ? urgentReorders.map((item, idx) => (
              <UrgentItemCard key={item.id} item={item} rank={idx + 1} onOrder={() => toggleOrder(item.id)} />
            )) : (
              <div className="w-full h-64 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400 gap-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <p className="font-black text-xl">모든 긴급 리오더 항목이 처리되었습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* 베스트셀러 섹션 */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
            <div className="bg-amber-500 p-2.5 rounded-xl shadow-lg shadow-amber-100">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Top Sellers Performance</h2>
              <p className="text-slate-400 text-sm font-bold tracking-tight">주간 최다 판매 SKU 리스트</p>
            </div>
          </div>
          <div className="flex overflow-x-auto pb-10 gap-8 no-scrollbar -mx-2 px-2 scroll-smooth">
            {topSellers.map((item, idx) => (
              <TopSellerCard key={item.id} item={item} rank={idx + 1} />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 bg-[#0F172A] rounded-[4rem] p-14 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="space-y-5">
                  <h3 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-4">
                    AI Reorder Strategy <BrainCircuit className="text-indigo-400 w-10 h-10" />
                  </h3>
                  <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
                    판매 가속도와 시즌 적합성을 바탕으로 최적의 리오더 시점과 수량을 제안합니다. <br/>
                    <strong>Gemini 1.5 Pro</strong> 엔진이 실시간으로 리스크를 평가합니다.
                  </p>
                </div>
                <button onClick={runAIAnalysis} disabled={isAnalyzing} className="bg-indigo-600 text-white px-12 py-6 rounded-[2.5rem] font-black flex items-center gap-4 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40">
                  {isAnalyzing ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" /> : <Zap className="w-6 h-6" />}
                  <span className="text-lg">AI 예측 가동</span>
                </button>
              </div>

              {aiInsights ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-6">
                  {aiInsights.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] border-l-8 border-l-indigo-500 group hover:bg-white/10 transition-all">
                      <h4 className="font-bold text-xl mb-5 text-indigo-100">{rec.productName}</h4>
                      <div className="flex items-center gap-5 mb-6 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <ShoppingCart className="w-6 h-6 text-indigo-400" />
                        <div>
                          <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1">권장 수량</p>
                          <span className="text-4xl font-black">{rec.suggestedQuantity.toLocaleString()} <span className="text-sm font-medium">EA</span></span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium italic">"{rec.reason}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center border-4 border-dashed border-white/10 rounded-[4rem] bg-white/[0.01]">
                   <Activity className="w-20 h-20 text-slate-700 animate-pulse" />
                   <p className="text-slate-500 font-black text-xl mt-6 uppercase tracking-widest">Awaiting Analysis...</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-14 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-2xl font-black mb-12 flex items-center gap-4">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              Category Momentum
            </h3>
            <div className="flex-1 min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={topSellers.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="brand" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="currentWeekSales" stroke="#6366f1" strokeWidth={6} fill="#6366f1" fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-10 p-10 bg-indigo-50 rounded-[3rem] border border-indigo-100">
               <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">System Health</p>
               <div className="flex items-center justify-between">
                 <p className="text-2xl font-black text-indigo-900">Synchronized</p>
                 <RefreshCcw className="w-8 h-8 text-indigo-300" />
               </div>
            </div>
          </div>
        </div>

        {/* 마스터 보드 */}
        <section className="bg-white rounded-[4.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-16 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-12">
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Master Inventory Board</h3>
              <p className="text-lg text-slate-400 font-medium mt-2">전사 통합 재고 데이터 실시간 탐색</p>
            </div>
            <div className="flex flex-wrap items-center gap-8">
              <div className="relative group">
                <Search className="w-6 h-6 absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input type="text" placeholder="Search product, barcode, or SKU..." className="pl-18 pr-12 py-6 bg-slate-50 border-none rounded-[2.5rem] text-base w-full md:w-[600px] outline-none shadow-inner font-semibold focus:ring-4 focus:ring-indigo-500/5 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] border-b border-slate-100">
                  <th className="px-16 py-10">Product Identity</th>
                  <th className="px-16 py-10">Stock AH/AI</th>
                  <th className="px-16 py-10">Sales W/V</th>
                  <th className="px-16 py-10">Prediction</th>
                  <th className="px-16 py-10">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-all group">
                    <td className="px-16 py-12">
                      <div className="flex flex-col gap-3">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black w-fit uppercase ${orderedItems.includes(item.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {orderedItems.includes(item.id) ? 'Ordered' : item.itemType}
                        </span>
                        <span className="font-black text-slate-900 text-2xl group-hover:text-indigo-600 transition-colors tracking-tight line-clamp-1">{item.productName}</span>
                        <span className="text-xs text-slate-400 font-mono tracking-tighter">BARCODE: {item.barcode} | SKU: {item.sku}</span>
                      </div>
                    </td>
                    <td className="px-16 py-12">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-end gap-3">
                          <span className="text-4xl font-black">{item.currentStock.toLocaleString()}</span>
                          <span className="text-xs text-slate-400 pb-2 font-bold uppercase tracking-widest">AH</span>
                        </div>
                        {item.inProductionStock > 0 && <span className="text-xs font-black text-indigo-600">AI: +{item.inProductionStock.toLocaleString()}</span>}
                      </div>
                    </td>
                    <td className="px-16 py-12">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-black text-slate-800">{item.currentWeekSales.toLocaleString()} <span className="text-xs font-normal">W</span></span>
                          <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl ${item.salesGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {item.salesGrowth >= 0 ? '↑' : '↓'} {Math.abs(item.salesGrowth).toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-[11px] font-black text-slate-300 uppercase">Last Week: {item.lastWeekSales.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-16 py-12">
                      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4 shadow-inner">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-400">
                          <span className="flex items-center gap-2 tracking-widest"><Clock className="w-4 h-4" /> Stock-out</span>
                          <span className="text-rose-600 text-sm">{item.expectedStockOutDate}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-400 border-t border-slate-200 pt-4">
                          <span className="flex items-center gap-2 tracking-widest"><Target className="w-4 h-4" /> Reorder by</span>
                          <span className="text-indigo-600 text-sm">{item.suggestedOrderDate}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-16 py-12">
                      <button onClick={() => toggleOrder(item.id)} className={`px-7 py-3 rounded-2xl text-[12px] font-black tracking-widest border-2 transition-all ${
                        orderedItems.includes(item.id) ? 'bg-emerald-600 text-white border-emerald-600' :
                        item.status === ReorderStatus.CRITICAL ? 'bg-rose-50 text-rose-600 border-rose-200' : 
                        'bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-500'
                      }`}>
                        {orderedItems.includes(item.id) ? 'COMPLETED' : item.status === ReorderStatus.CRITICAL ? '🚨 CRITICAL' : 'MANAGE'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; sub: string; color: string; isAlert?: boolean; icon: React.ReactNode; }> = ({ title, value, sub, color, isAlert, icon }) => {
  const colors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    red: 'text-rose-600 bg-rose-50 border-rose-300',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  };
  return (
    <div className={`bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden ${isAlert ? 'ring-8 ring-rose-50 border-rose-200' : 'hover:-translate-y-2'}`}>
      <div className="flex items-center justify-between mb-8 relative z-10">
        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{title}</span>
        <div className={`p-5 rounded-[2rem] transition-all group-hover:rotate-12 ${colors[color]}`}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-8 h-8' }) : icon}
        </div>
      </div>
      <div className="text-6xl font-black text-slate-900 tracking-tighter group-hover:scale-105 transition-transform origin-left relative z-10">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <p className="text-[12px] text-slate-400 font-bold mt-5 uppercase tracking-[0.25em] relative z-10">{sub}</p>
    </div>
  );
};

const TopSellerCard: React.FC<{ item: InventoryItem; rank: number }> = ({ item, rank }) => {
  return (
    <div className="flex-shrink-0 w-[440px] bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-4 transition-all group relative overflow-hidden">
      {rank <= 3 && (
        <div className="absolute top-0 right-0 p-10 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
          <Crown className={`w-40 h-40 rotate-12 ${rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-slate-400' : 'text-orange-600'}`} />
        </div>
      )}
      <div className="flex justify-between items-start mb-12">
        <div className={`w-18 h-18 rounded-[1.8rem] flex items-center justify-center text-3xl font-black border-2 shadow-lg ${
          rank === 1 ? 'bg-slate-900 text-white border-slate-800' : 
          rank === 2 ? 'bg-slate-100 text-slate-800 border-slate-200' :
          rank === 3 ? 'bg-slate-50 text-slate-600 border-slate-100' :
          'bg-slate-50 text-slate-400 border-slate-50'
        }`}>
          {rank}
        </div>
        <div className={`flex flex-col items-end gap-1.5 font-black text-base px-5 py-2.5 rounded-2xl shadow-sm ${item.salesGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          <div className="flex items-center gap-1.5">
            {item.salesGrowth >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            {Math.abs(item.salesGrowth).toFixed(0)}%
          </div>
          <span className="text-[9px] uppercase tracking-tighter opacity-70">Weekly Momentum</span>
        </div>
      </div>
      <div className="space-y-4 min-h-[160px]">
        <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-[0.25em]">{item.brand}</span>
        <h4 className="font-black text-slate-900 text-[26px] leading-[1.3] line-clamp-2 group-hover:text-indigo-600 transition-colors tracking-tighter">
          {item.productName}
        </h4>
        <p className="text-xs text-slate-400 font-mono italic">BARCODE: {item.barcode}</p>
      </div>
      <div className="mt-12 pt-12 border-t border-slate-50 grid grid-cols-2 gap-10">
        <div>
          <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">Weekly (W)</p>
          <p className="text-5xl font-black text-slate-900 tracking-tighter">{item.currentWeekSales.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">Inventory (AH)</p>
          <p className="text-5xl font-black text-indigo-600 tracking-tighter">{item.currentStock.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

const UrgentItemCard: React.FC<{ item: InventoryItem; rank: number; onOrder: () => void }> = ({ item, rank, onOrder }) => {
  const shortageAmount = Math.max(0, (item.currentWeekSales * 3) - item.currentStock);
  const daysRemaining = Math.max(0, Math.floor(item.currentStock / (item.dailySalesAvg || 1)));

  return (
    <div className="flex-shrink-0 w-[460px] bg-white p-12 rounded-[4.5rem] border-2 border-rose-100 shadow-[0_30px_70px_-20px_rgba(244,63,94,0.15)] hover:shadow-[0_50px_100px_-30px_rgba(244,63,94,0.3)] hover:-translate-y-5 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Flame className="w-56 h-56 rotate-12 text-rose-600" />
      </div>
      
      <div className="flex justify-between items-start mb-12 relative z-10">
        <div className={`w-20 h-20 rounded-[2.2rem] flex items-center justify-center text-4xl font-black border-2 bg-rose-600 text-white border-rose-400 shadow-xl shadow-rose-200`}>
          {rank}
        </div>
        <div className="flex flex-col items-end gap-3">
           <span className="px-5 py-2.5 bg-rose-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-rose-200">Critical Priority</span>
           <span className="text-[11px] font-black text-rose-500 uppercase flex items-center gap-2 animate-pulse"><Clock className="w-4 h-4"/> Approx. {daysRemaining} days left</span>
        </div>
      </div>

      <div className="space-y-5 min-h-[160px] relative z-10">
        <div className="flex items-center gap-3">
           <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">{item.brand}</span>
           <span className="text-[10px] font-bold text-slate-300 tracking-tighter italic font-mono">{item.barcode}</span>
        </div>
        <h4 className="font-black text-slate-900 text-[28px] leading-[1.2] line-clamp-2 group-hover:text-rose-600 transition-colors tracking-tighter">
          {item.productName}
        </h4>
      </div>

      <div className="mt-12 pt-12 border-t-4 border-rose-50 grid grid-cols-2 gap-10 relative z-10">
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Weekly Sales</p>
          <p className="text-5xl font-black text-slate-900 tracking-tighter">{item.currentWeekSales.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center justify-end gap-2">In Stock</p>
          <p className="text-5xl font-black text-rose-600 tracking-tighter">{item.currentStock.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-4 relative z-10">
        <div className="flex items-center justify-between px-10 py-8 bg-slate-900 rounded-[3rem] shadow-2xl">
          <div className="flex flex-col gap-1 text-white">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Target Quantity</span>
            <span className="text-3xl font-black tracking-tight">{shortageAmount.toLocaleString()} <span className="text-sm font-medium">EA +</span></span>
          </div>
          <div className="text-right text-white">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Timeline</span>
            <span className="text-lg font-black block border-b-2 border-indigo-500">TODAY</span>
          </div>
        </div>
        <button onClick={onOrder} className="w-full py-6 bg-rose-50 text-rose-600 font-black rounded-[2.5rem] border-2 border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3 group">
          <CheckCircle2 className="w-5 h-5 group-hover:scale-125 transition-transform" />
          Mark as Ordered
        </button>
      </div>
    </div>
  );
};

export default App;
