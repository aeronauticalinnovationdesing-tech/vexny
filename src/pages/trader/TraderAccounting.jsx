import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, TrendingDown, Building2, Trash2, PiggyBank, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useProfile } from "@/lib/ProfileContext";

const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

export default function TraderAccounting() {
  const [showTx, setShowTx] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [txForm, setTxForm] = useState({ description: "", amount: 0, type: "income", category: "investment", date: format(new Date(), "yyyy-MM-dd"), bank_account_id: "" });
  const [accForm, setAccForm] = useState({ name: "", bank_name: "", account_type: "investment", balance: 0, currency: "COP" });
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.email],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", user?.email],
    queryFn: () => base44.entities.BankAccount.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const createTx = useMutation({ mutationFn: (d) => base44.entities.Transaction.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); setShowTx(false); } });
  const deleteTx = useMutation({ mutationFn: (id) => base44.entities.Transaction.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }) });
  const createAcc = useMutation({ mutationFn: (d) => base44.entities.BankAccount.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); setShowAccount(false); } });
  const deleteAcc = useMutation({ mutationFn: (id) => base44.entities.BankAccount.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }) });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const pnl = totalIncome - totalExpense;
  const totalCapital = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const roi = totalCapital > 0 ? ((pnl / totalCapital) * 100).toFixed(2) : 0;
  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-emerald-500" />
          <h1 className="text-2xl font-bold tracking-tight">Capital & Contabilidad</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAccount(true)} className="gap-2">
            <Building2 className="w-4 h-4" /> <span className="hidden sm:inline">Nueva Cuenta</span>
          </Button>
          <Button onClick={() => setShowTx(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo Movimiento</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Ganancias</span></div>
          <p className="text-lg font-bold text-emerald-600">+{formatCOP(totalIncome)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-xs text-muted-foreground">Pérdidas</span></div>
          <p className="text-lg font-bold text-red-600">-{formatCOP(totalExpense)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><PiggyBank className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">P&L Neto</span></div>
          <p className={cn("text-lg font-bold", pnl >= 0 ? "text-emerald-600" : "text-red-600")}>{pnl >= 0 ? "+" : ""}{formatCOP(pnl)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><BarChart2 className="w-4 h-4 text-violet-500" /><span className="text-xs text-muted-foreground">ROI</span></div>
          <p className={cn("text-lg font-bold", roi >= 0 ? "text-violet-600" : "text-red-600")}>{roi}%</p>
        </div>
      </div>

      {/* Capital Overview */}
      {accounts.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Cuentas de Trading</h3>
          {accounts.map(acc => {
            const totalCap = accounts.reduce((s, a) => s + (a.balance || 0), 0);
            const pct = totalCap > 0 ? (acc.balance / totalCap) * 100 : 0;
            return (
              <div key={acc.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{acc.name} <span className="text-muted-foreground">· {acc.bank_name}</span></span>
                    <span className="text-muted-foreground">{formatCOP(acc.balance)}</span>
                  </div>
                  <Progress value={Math.max(2, pct)} className="h-2.5 [&>div]:bg-emerald-500" />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => deleteAcc.mutate(acc.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
          <div className="pt-1 border-t border-border flex justify-between text-xs font-semibold">
            <span>Capital Total</span><span>{formatCOP(totalCapital)}</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Historial P&L</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="space-y-2 mt-4">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border group">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", tx.type === "income" ? "bg-emerald-100" : "bg-red-100")}>
                {tx.type === "income" ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{tx.description}</p>
                <p className="text-xs text-muted-foreground">
                  {accountMap[tx.bank_account_id] && `${accountMap[tx.bank_account_id]} · `}
                  {tx.date && format(new Date(tx.date), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <span className={cn("font-bold text-sm shrink-0", tx.type === "income" ? "text-emerald-600" : "text-red-600")}>
                {tx.type === "income" ? "+" : "-"}{formatCOP(tx.amount)}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteTx.mutate(tx.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {transactions.length === 0 && <div className="text-center py-12 text-muted-foreground">Sin movimientos registrados</div>}
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-card rounded-2xl border border-border p-5 group relative">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-emerald-500" />
                  <div><p className="font-semibold text-sm">{acc.name}</p><p className="text-xs text-muted-foreground">{acc.bank_name}</p></div>
                </div>
                <p className="text-xl font-bold mb-1">{formatCOP(acc.balance)}</p>
                <p className="text-xs text-muted-foreground capitalize">{acc.account_type}</p>
                <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteAcc.mutate(acc.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          {accounts.length === 0 && <div className="text-center py-12 text-muted-foreground">Sin cuentas registradas</div>}
        </TabsContent>
      </Tabs>

      {/* Tx Dialog */}
      <Dialog open={showTx} onOpenChange={setShowTx}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Movimiento de Capital</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createTx.mutate({ ...txForm, amount: Number(txForm.amount) }); }} className="space-y-4">
            <div><Label>Descripción</Label><Input value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="Ej: Ganancia BTC/USDT, Retiro de ganancias..." required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monto (COP)</Label><Input type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} required /></div>
              <div><Label>Tipo</Label>
                <Select value={txForm.type} onValueChange={v => setTxForm({ ...txForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Ganancia 📈</SelectItem>
                    <SelectItem value="expense">Pérdida 📉</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha</Label><Input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} /></div>
              <div><Label>Cuenta</Label>
                <Select value={txForm.bank_account_id || "none"} onValueChange={v => setTxForm({ ...txForm, bank_account_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sin cuenta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cuenta</SelectItem>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTx(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Dialog */}
      <Dialog open={showAccount} onOpenChange={setShowAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Cuenta de Trading</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createAcc.mutate({ ...accForm, balance: Number(accForm.balance), currency: "COP" }); }} className="space-y-4">
            <div><Label>Nombre (Ej: Binance, TD Ameritrade)</Label><Input value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} required /></div>
            <div><Label>Broker / Exchange</Label><Input value={accForm.bank_name} onChange={e => setAccForm({ ...accForm, bank_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={accForm.account_type} onValueChange={v => setAccForm({ ...accForm, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investment">Inversión</SelectItem>
                    <SelectItem value="checking">Corriente</SelectItem>
                    <SelectItem value="savings">Ahorros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Capital inicial (COP)</Label><Input type="number" value={accForm.balance} onChange={e => setAccForm({ ...accForm, balance: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAccount(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}