import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown, Wallet, Coins } from "lucide-react";

function BalanceBar({ label, value, max, color, icon: Icon }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-bold">${value.toLocaleString()}</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color.includes("green") ? "bg-gradient-to-r from-green-400 to-emerald-500" : color.includes("red") ? "bg-gradient-to-r from-red-400 to-rose-500" : "bg-gradient-to-r from-primary to-amber-500"}`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-white/10 rounded-full" />
        </div>
        {pct > 0 && (
          <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-white/80 mix-blend-overlay">{pct}%</span>
        )}
      </div>
    </div>
  );
}

export default function MoneyGoalBars({ transactions, bankAccounts = [] }) {
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  // Monthly view
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthIncome = transactions.filter(t => t.type === "income" && t.date?.startsWith(monthKey)).reduce((s, t) => s + (t.amount || 0), 0);
  const monthExpense = transactions.filter(t => t.type === "expense" && t.date?.startsWith(monthKey)).reduce((s, t) => s + (t.amount || 0), 0);
  const monthMax = Math.max(monthIncome, monthExpense, 1);

  const savingRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const savingColor = savingRate >= 30 ? "🏆" : savingRate >= 15 ? "💪" : savingRate >= 0 ? "⚠️" : "🔴";

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base">Arsenal Financiero</h2>
        </div>
        <Link to="/Accounting" className="text-primary text-xs font-medium flex items-center gap-1 hover:underline">
          Ver todo <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Balance hero */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-amber-500/5 border border-primary/20">
        <p className="text-xs text-muted-foreground mb-1">Balance Total</p>
        <p className={`text-3xl font-black ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
          {balance >= 0 ? "+" : ""}${balance.toLocaleString()}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg">{savingColor}</span>
          <span className="text-xs text-muted-foreground">
            Tasa de ahorro: <span className={`font-bold ${savingRate >= 30 ? "text-green-400" : savingRate >= 0 ? "text-yellow-400" : "text-red-400"}`}>{savingRate}%</span>
          </span>
        </div>
        {/* Saving rate bar */}
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${savingRate >= 30 ? "bg-gradient-to-r from-green-400 to-emerald-500" : savingRate >= 0 ? "bg-gradient-to-r from-yellow-400 to-amber-500" : "bg-gradient-to-r from-red-400 to-rose-500"}`}
            style={{ width: `${Math.max(0, Math.min(savingRate, 100))}%` }}
          />
        </div>
      </div>

      {/* Monthly breakdown */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Este Mes</p>
        <div className="space-y-3">
          <BalanceBar label="Ingresos del mes" value={monthIncome} max={monthMax} color="text-green-400" icon={TrendingUp} />
          <BalanceBar label="Gastos del mes" value={monthExpense} max={monthMax} color="text-red-400" icon={TrendingDown} />
        </div>
      </div>

      {/* Bank accounts */}
      {bankAccounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cuentas</p>
          <div className="space-y-2">
            {bankAccounts.slice(0, 4).map(acc => {
              const maxBal = Math.max(...bankAccounts.map(a => Math.abs(a.balance || 0)), 1);
              const pct = Math.min(Math.round((Math.abs(acc.balance || 0) / maxBal) * 100), 100);
              return (
                <div key={acc.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{acc.name}</span>
                    <span className={`font-bold ${(acc.balance || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {acc.currency || "USD"} ${(acc.balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${(acc.balance || 0) >= 0 ? "bg-gradient-to-r from-primary to-amber-400" : "bg-gradient-to-r from-red-400 to-rose-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}