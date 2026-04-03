// Re-export original accounting logic for non-trader profiles
// This uses the same full accounting page but without the trader-specific branding
import React, { useState, useMemo, useEffect } from "react";
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
import { useProfile } from "@/lib/ProfileContext";
import { useNavigate } from "react-router-dom";

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
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

export default function GenericAccounting() {
   const { activeProfile, activeProfileId } = useProfile();
   const navigate = useNavigate();
   const [showTx, setShowTx] = useState(false);
   const [showAccount, setShowAccount] = useState(false);
   const [txForm, setTxForm] = useState({ description: "", amount: 0, type: "expense", category: "other", date: format(new Date(), "yyyy-MM-dd"), bank_account_id: "", profile_id: activeProfileId });
   const [accForm, setAccForm] = useState({ name: "", bank_name: "", account_type: "checking", balance: 0, currency: "COP", profile_id: activeProfileId });

   useEffect(() => {
     setTxForm(prev => ({ ...prev, profile_id: activeProfileId }));
     setAccForm(prev => ({ ...prev, profile_id: activeProfileId }));
   }, [activeProfileId]);
   const queryClient = useQueryClient();
   const user = useCurrentUser();

   const { data: rawTransactions = [] } = useQuery({
     queryKey: ["transactions", user?.email, activeProfileId],
     queryFn: () => base44.entities.Transaction.filter({ created_by: user.email, profile_id: activeProfileId }, "-created_date"),
     enabled: !!user && !!activeProfileId,
   });
   const { data: rawAccounts = [] } = useQuery({
     queryKey: ["accounts", user?.email, activeProfileId],
     queryFn: () => base44.entities.BankAccount.filter({ created_by: user.email, profile_id: activeProfileId }),
     enabled: !!user && !!activeProfileId,
   });

   // Filtro defensivo: solo mostrar registros que pertenezcan estrictamente a este perfil
   const transactions = rawTransactions.filter(t => t.profile_id === activeProfileId);
   const accounts = rawAccounts.filter(a => a.profile_id === activeProfileId);

  const createTx = useMutation({ mutationFn: (d) => base44.entities.Transaction.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions", user?.email, activeProfileId] }); setShowTx(false); } });
  const deleteTx = useMutation({ mutationFn: (id) => base44.entities.Transaction.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions", user?.email, activeProfileId] }) });
  const createAcc = useMutation({ mutationFn: (d) => base44.entities.BankAccount.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts", user?.email, activeProfileId] }); setShowAccount(false); } });
  const deleteAcc = useMutation({ mutationFn: (id) => base44.entities.BankAccount.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts", user?.email, activeProfileId] }) });

  const totalAccountBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalAccountBalance + totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((balance - totalAccountBalance) / totalIncome) * 100)) : 0;
  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));

  const expenseByCategory = useMemo(() => {
    const map = {};
    transactions.filter(t => t.type === "expense").forEach(t => { map[t.category] = (map[t.category] || 0) + (t.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const accent = activeProfile?.accent || "#f59e0b";

  if (!activeProfileId) {
    navigate("/");
    return null;
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6" style={{ color: accent }} />
          <h1 className="text-2xl font-bold tracking-tight">Finanzas</h1>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-500" /><span className="text-xs text-muted-foreground">Ingresos</span></div>
          <p className="text-lg font-bold text-green-600">{formatCOP(totalIncome)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-xs text-muted-foreground">Gastos</span></div>
          <p className="text-lg font-bold text-red-600">{formatCOP(totalExpense)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Balance</span></div>
          <p className={cn("text-lg font-bold", balance >= 0 ? "text-primary" : "text-red-600")}>{formatCOP(balance)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><PiggyBank className="w-4 h-4 text-violet-500" /><span className="text-xs text-muted-foreground">Ahorro</span></div>
          <p className="text-lg font-bold text-violet-600">{savingsRate}%</p>
        </div>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Movimientos</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="space-y-2 mt-4">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border group">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", tx.type === "income" ? "bg-green-100" : "bg-red-100")}>
                {tx.type === "income" ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{tx.description}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[tx.category]}{accountMap[tx.bank_account_id] && ` · ${accountMap[tx.bank_account_id]}`}
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
                  <div><p className="font-semibold text-sm">{acc.name}</p><p className="text-xs text-muted-foreground">{acc.bank_name}</p></div>
                </div>
                <p className="text-xl font-bold mb-1">{formatCOP(acc.balance)}</p>
                <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteAcc.mutate(acc.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          {accounts.length === 0 && <div className="text-center py-12 text-muted-foreground">Sin cuentas registradas</div>}
        </TabsContent>
      </Tabs>

      <Dialog open={showTx} onOpenChange={setShowTx}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Movimiento</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createTx.mutate({ ...txForm, amount: Number(txForm.amount) }); }} className="space-y-4">
            <div><Label>Descripción</Label><Input value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monto (COP)</Label><Input type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} required /></div>
              <div><Label>Tipo</Label>
                <Select value={txForm.type} onValueChange={v => setTxForm({ ...txForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Ingreso</SelectItem><SelectItem value="expense">Gasto</SelectItem></SelectContent>
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

      <Dialog open={showAccount} onOpenChange={setShowAccount}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Cuenta Bancaria</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createAcc.mutate({ ...accForm, balance: Number(accForm.balance), currency: "COP" }); }} className="space-y-4">
            <div><Label>Nombre</Label><Input value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} required /></div>
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
              <div><Label>Saldo inicial (COP)</Label><Input type="number" value={accForm.balance} onChange={e => setAccForm({ ...accForm, balance: e.target.value })} /></div>
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