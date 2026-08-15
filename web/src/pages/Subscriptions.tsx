import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { 
  RefreshCw, CreditCard, TrendingUp 
} from "lucide-react";

interface Subscription {
  merchant: string;
  amount: number;
  previous_amount?: number;
  billing_cycle: string;
  last_billed: string;
  payment_method: string;
  price_changed: boolean;
  change_description?: string;
}

interface SubscriptionAlert {
  type: string;
  merchant: string;
  message: string;
  old_price: number;
  new_price: number;
}

interface SubscriptionResponse {
  subscriptions: Subscription[];
  total_monthly: number;
  alerts: SubscriptionAlert[];
}

export const Subscriptions: React.FC = () => {
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/subscriptions");
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Active Subscriptions</h2>
        <p className="text-dark-muted text-sm mt-0.5">Track monthly recurring payments and price hikes automatically</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-dark-muted">
          <RefreshCw className="animate-spin mr-2" /> Loading subscriptions...
        </div>
      ) : !data ? (
        <div className="text-center py-10 text-dark-muted">Error loading subscriptions.</div>
      ) : (
        <div className="space-y-6">
          {/* Price Change Warning Banner */}
          {data.alerts.map((alert, idx) => (
            <div key={idx} className="glass-panel border-semantic-review/30 bg-semantic-review/5 p-4 flex items-center gap-3">
              <div className="p-2 bg-semantic-review/10 text-semantic-review rounded-lg">
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Subscription Price Hike Detected</h4>
                <p className="text-xs text-dark-muted mt-0.5">
                  {alert.message} PaisaWise flagged this adjustment from your incoming SMS receipts.
                </p>
              </div>
            </div>
          ))}

          {/* Aggregate Card */}
          <div className="glass-panel p-6 bg-gradient-to-br from-dark-card to-dark-hover/40 max-w-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 text-dark-accent/15">
              <CreditCard size={56} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Total Monthly Subscriptions</span>
            <h3 className="text-3xl font-bold text-white mt-2">₹{data.total_monthly.toLocaleString()}/month</h3>
            <p className="text-xs text-dark-muted mt-2">Aggregated from active monthly recurring bills</p>
          </div>

          {/* Subscriptions Grid Ledger */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.subscriptions.map((sub) => (
              <div key={sub.merchant} className="glass-panel p-5 bg-dark-card/40 border border-dark-border/40 hover:border-dark-border transition-all flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-lg">{sub.merchant}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-dark-hover border border-dark-border text-dark-muted rounded-full">
                    {sub.billing_cycle}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">₹{sub.amount.toLocaleString()}</span>
                  <span className="text-xs text-dark-muted">/month</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-dark-border/60 text-xs text-dark-muted">
                  <div className="flex items-center justify-between">
                    <span>Last Billing:</span>
                    <span className="text-white font-medium">{sub.last_billed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment Mode:</span>
                    <span className="text-white font-medium">{sub.payment_method}</span>
                  </div>
                </div>

                {/* Price Hike Warning indicator inside card */}
                {sub.price_changed && (
                  <div className="p-2 bg-semantic-review/10 border border-semantic-review/20 text-semantic-review rounded-lg text-[10px] text-center font-semibold">
                    Price hiked from ₹{sub.previous_amount}!
                  </div>
                )}
              </div>
            ))}
            {data.subscriptions.length === 0 && (
              <div className="col-span-3 glass-panel p-12 text-center text-dark-muted text-sm">
                No active monthly recurring subscriptions detected.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
