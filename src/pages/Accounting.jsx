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
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, TrendingUp, TrendingDown, Building2, Trash2, PiggyBank, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const categoryLabels = {
  salary: "Salario", freelance: "Freelance", investment: "Inversión", office: "Oficina",
  tools: "Herramientas", marketing: "Marketing", travel: "Viajes", food: "Alimentación",
  utilities: "Servicios", other: "Otro"
};

const categoryColors = {
  salary: "bg-green-500", freelance: "bg-emerald-500", investment: "bg-blue-500",
  office: "bg-orange-500", tools: "bg-violet-500", marketing: "bg-pink-500",
  travel: "bg-sky-500", food: "bg-amber-500", utilities: "bg-red-500", other: "bg-gray-400"
};

const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

export default function Accounting() {
  const [showTx, setShowTx] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [txForm, setTxForm] = useState({ description: "", amount: 0, type: "expense", category: "other", date: format(new Date(), "yyyy-MM-dd"), bank_account_id: "" });
  const [accForm, setAccForm] = useState({ name: "", bank_name: "", account_type: "checking", balance: 0, currency: "COP" });
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => base44.entities.Transaction.list("-created_date") });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: () => base44.entities.BankAccount.list() });

  const createTx = useMutation({ mutationFn: (d) => base44.entities.Transaction.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); setShowTx(false); } });
  const deleteTx = useMutation({ mutationFn: (id) => base44.entities.Transaction.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }) });
  const createAcc = useMutation({ mutationFn: (d) => base44.entities.BankAccount.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); setShowAccount(false); } });
  const deleteAcc = useMutation({ mutationFn: (id) => base44.entities.BankAccount.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }) });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((balance / totalIncome) * 100)) : 0;
  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));
  const totalAccountBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  // Category breakdown for expenses
  const expenseByCategory = useMemo(() => {
    const map = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      map[t.category] = (map[t.category] || 0) + (t.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Category breakdown for income
  const incomeByCategory = useMemo(() => {
    const map = {};
    transactions.filter(t => t.type === "income").forEach(t => {
      map[t.category] = (map[t.category] || 0) + (t.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1>
          <Badge variant="outline" className="text-xs font-semibold">COP</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAccount(true)} className="gap-2">
            <Building2 className="w-4 h-4" /> <span className="hidden sm:inline">Nueva Cuenta</span>
          </Button>
          <Button onClick={() => setShowTx(true)} className="gap-2">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo Movimiento</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Ingresos</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCOP(totalIncome)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Gastos</span>
          </div>
          <p className="text-lg font-bold text-red-600">{formatCOP(totalExpense)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Balance</span>
          </div>
          <p className={cn("text-lg font-bold", balance >= 0 ? "text-primary" : "text-red-600")}>{formatCOP(balance)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="w-4 h-4 text-violet-500" />
            <span className="text-xs text-muted-foreground">Tasa ahorro</span>
          </div>
          <p className="text-lg font-bold text-violet-600">{savingsRate}%</p>
        </div>
      </div>

      {/* Progress Bars Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income vs Expense bar */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Flujo de caja
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-600 font-medium">Ingresos</span>
                <span className="text-muted-foreground">{formatCOP(totalIncome)}</span>
              </div>
              <Progress value={100} className="h-3 [&>div]:bg-green-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-500 font-medium">Gastos</span>
                <span className="text-muted-foreground">{formatCOP(totalExpense)}</span>
              </div>
              <Progress
                value={totalIncome > 0 ? Math.min(100, (totalExpense / totalIncome) * 100) : 0}
                className="h-3 [&>div]:bg-red-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-violet-600 font-medium">Ahorro</span>
                <span className="text-muted-foreground">{savingsRate}%</span>
              </div>
              <Progress value={savingsRate} className="h-3 [&>div]:bg-violet-500" />
            </div>
          </div>
        </div>

        {/* Accounts balance bars */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Cuentas bancarias
          </h3>
          {accounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin cuentas registradas</p>
          ) : (
            <div className="space-y-3">
              {accounts.map(acc => {
                const pct = totalAccountBalance > 0 ? (acc.balance / totalAccountBalance) * 100 : 0;
                return (
                  <div key={acc.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate">{acc.name} <span className="text-muted-foreground">· {acc.bank_name}</span></span>
                      <span className="text-muted-foreground ml-2 shrink-0">{formatCOP(acc.balance)}</span>
                    </div>
                    <Progress value={Math.max(2, pct)} className="h-2.5 [&>div]:bg-primary" />
                  </div>
                );
              })}
              <div className="pt-1 border-t border-border flex justify-between text-xs font-semibold">
                <span>Total</span>
                <span>{formatCOP(totalAccountBalance)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {(expenseByCategory.length > 0 || incomeByCategory.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {expenseByCategory.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" /> Gastos por categoría
              </h3>
              {expenseByCategory.map(([cat, amount]) => {
                const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{categoryLabels[cat] || cat}</span>
                      <span className="text-muted-foreground">{formatCOP(amount)} · {Math.round(pct)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", categoryColors[cat] || "bg-gray-400")}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {incomeByCategory.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" /> Ingresos por categoría
              </h3>
              {incomeByCategory.map(([cat, amount]) => {
                const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{categoryLabels[cat] || cat}</span>
                      <span className="text-muted-foreground">{formatCOP(amount)} · {Math.round(pct)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", categoryColors[cat] || "bg-gray-400")}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Movimientos</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-2 mt-4">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border group">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                tx.type === "income" ? "bg-green-100" : "bg-red-100"
              )}>
                {tx.type === "income"
                  ? <TrendingUp className="w-5 h-5 text-green-600" />
                  : <TrendingDown className="w-5 h-5 text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{tx.description}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[tx.category]}
                  {accountMap[tx.bank_account_id] && ` · ${accountMap[tx.bank_account_id]}`}
                  {tx.date && ` · ${format(new Date(tx.date), "d MMM yyyy", { locale: es })}`}
                </p>
              </div>
              <span className={cn("font-bold text-sm shrink-0", tx.type === "income" ? "text-green-600" : "text-red-600")}>
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
                  <Building2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{acc.bank_name}</p>
                  </div>
                </div>
                <p className="text-xl font-bold mb-3">{formatCOP(acc.balance)}</p>
                <Progress
                  value={totalAccountBalance > 0 ? Math.max(2, (acc.balance / totalAccountBalance) * 100) : 2}
                  className="h-2 [&>div]:bg-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {totalAccountBalance > 0 ? Math.round((acc.balance / totalAccountBalance) * 100) : 0}% del total
                </p>
                <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteAcc.mutate(acc.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          {accounts.length === 0 && <div className="text-center py-12 text-muted-foreground">Sin cuentas registradas</div>}
        </TabsContent>
      </Tabs>

      {/* Transaction Dialog */}
      <Dialog open={showTx} onOpenChange={setShowTx}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Movimiento</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createTx.mutate({ ...txForm, amount: Number(txForm.amount) }); }} className="space-y-4">
            <div><Label>Descripción</Label><Input value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto (COP)</Label>
                <Input type="number" placeholder="0" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} required />
              </div>
              <div><Label>Tipo</Label>
                <Select value={txForm.type} onValueChange={v => setTxForm({ ...txForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoría</Label>
                <Select value={txForm.category} onValueChange={v => setTxForm({ ...txForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fecha</Label><Input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} /></div>
            </div>
            <div><Label>Cuenta</Label>
              <Select value={txForm.bank_account_id || "none"} onValueChange={v => setTxForm({ ...txForm, bank_account_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sin cuenta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cuenta</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
          <DialogHeader><DialogTitle>Nueva Cuenta Bancaria</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createAcc.mutate({ ...accForm, balance: Number(accForm.balance), currency: "COP" }); }} className="space-y-4">
            <div><Label>Nombre de la cuenta</Label><Input value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} required /></div>
            <div><Label>Banco</Label><Input value={accForm.bank_name} onChange={e => setAccForm({ ...accForm, bank_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={accForm.account_type} onValueChange={v => setAccForm({ ...accForm, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Corriente</SelectItem>
                    <SelectItem value="savings">Ahorros</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                    <SelectItem value="investment">Inversión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Saldo inicial (COP)</Label>
                <Input type="number" placeholder="0" value={accForm.balance} onChange={e => setAccForm({ ...accForm, balance: e.target.value })} />
              </div>
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