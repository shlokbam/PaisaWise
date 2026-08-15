import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { 
  BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { RefreshCw } from "lucide-react";

interface CategoryData {
  category: string;
  code: string;
  color: string;
  value: number;
}

interface MerchantData {
  merchant: string;
  value: number;
  count: number;
}

interface MonthlyData {
  month: string;
  spending: number;
  income: number;
}

export const Analytics: React.FC = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const catsData = await apiRequest("/analytics/categories");
      const merchsData = await apiRequest("/analytics/merchants");
      const monthlyData = await apiRequest("/analytics/monthly");
      
      setCategories(catsData);
      setMerchants(merchsData);
      setMonthly(monthlyData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
        {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Visual Analytics</h2>
          <p className="text-dark-muted text-sm mt-0.5">Explore spending structures and monthly cashflows</p>
        </div>
        <button onClick={fetchAnalytics} className="premium-btn-secondary py-2 text-xs">
          <RefreshCw size={14} /> Refresh Charts
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-dark-muted">
          <RefreshCw className="animate-spin mr-2" /> Rendering charts...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Row 1: MoM bar chart */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4">Month-Over-Month Comparison</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242F4D" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161D30', borderColor: '#242F4D', borderRadius: 8, color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="income" name="Inflow / Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spending" name="Personal Expenses" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Categories Pie Chart and Top Merchants */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category allocation */}
            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">Spending by Category</h3>
              <div className="h-64 flex-1 flex flex-col sm:flex-row items-center justify-center gap-6">
                {categories.length === 0 ? (
                  <div className="text-dark-muted text-sm text-center py-20 w-full">No expense data for chart.</div>
                ) : (
                  <>
                    <div className="h-full w-full sm:w-1/2 min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categories}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#161D30', borderColor: '#242F4D', borderRadius: 8, color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Custom Legend */}
                    <div className="flex flex-col gap-2.5 text-xs w-full sm:w-1/2 select-none">
                      {categories.slice(0, 6).map((c) => (
                        <div key={c.category} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="text-white font-medium">{c.category}</span>
                          </div>
                          <span className="text-dark-muted font-bold">₹{c.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Top Merchants list */}
            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">Top Spending Merchants</h3>
              <div className="flex-1 divide-y divide-dark-border/40 overflow-y-auto max-h-[300px] pr-2">
                {merchants.map((m, idx) => (
                  <div key={m.merchant} className="py-3 flex items-center justify-between text-sm first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-dark-muted w-5 text-center">#{idx + 1}</span>
                      <div>
                        <h5 className="font-semibold text-white">{m.merchant}</h5>
                        <p className="text-xs text-dark-muted mt-0.5">{m.count} transactions</p>
                      </div>
                    </div>
                    <span className="font-bold text-white">₹{m.value.toLocaleString()}</span>
                  </div>
                ))}
                {merchants.length === 0 && (
                  <div className="text-center py-20 text-dark-muted text-sm">
                    No merchant transaction records found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
