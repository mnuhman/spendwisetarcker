import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  PieChart, 
  ChevronRight, 
  Edit2, 
  X, 
  Save,
  Trash2,
  Filter,
  ArrowLeft,
  Download,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, CATEGORIES } from './types';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'gold' | 'standard'>('gold');

  // Form State
  const [type, setType] = useState<'expense' | 'revenue'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setEditingTransaction(null);
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setType(t.type);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setDate(t.date);
    setNote(t.note || '');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type,
      amount: parseFloat(amount),
      category,
      date,
      note
    };

    try {
      if (editingTransaction) {
        await fetch(`/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      fetchTransactions();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const handleDelete = async (id: number | null) => {
    if (id === null) return;
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Delete failed');
      }
      
      if (editingTransaction?.id === id) {
        resetForm();
        setIsFormOpen(false);
      }
      
      await fetchTransactions();
      setIsDeleting(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch('/api/transactions', { method: 'DELETE' });
      if (!response.ok) throw new Error('Bulk delete failed');
      await fetchTransactions();
      setIsClearingAll(false);
      setIsReportOpen(false);
    } catch (err) {
      console.error('Clear failed:', err);
      alert('Failed to clear ledger.');
    }
  };

  const handleExportCSV = (month: string, data: any) => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note'];
    const monthTransactions = transactions.filter(t => t.date.startsWith(month));
    const rows = monthTransactions.map(t => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.note || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `SpendWise_Report_${month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'revenue') acc.revenue += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { revenue: 0, expense: 0 });
  }, [transactions]);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const monthlyReport = useMemo(() => {
    const months: Record<string, { 
      revenue: number, 
      expense: number, 
      categories: Record<string, number> 
    }> = {};
    
    transactions.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (!months[month]) {
        months[month] = { revenue: 0, expense: 0, categories: {} };
      }
      if (t.type === 'revenue') {
        months[month].revenue += t.amount;
      } else {
        months[month].expense += t.amount;
        months[month].categories[t.category] = (months[month].categories[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  return (
    <div className={`max-w-md mx-auto min-h-screen bg-zinc-950 pb-24 relative overflow-x-hidden text-zinc-100 ${theme === 'standard' ? 'theme-standard' : ''}`}>
      {/* Header */}
      <header className="p-6 pt-12 bg-zinc-900/50 backdrop-blur-lg border-b brand-border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold gold-text-gradient">SpendWise</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Elite Financial Tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(theme === 'gold' ? 'standard' : 'gold')}
              className="p-2.5 bg-zinc-800 rounded-full border brand-border hover:bg-zinc-700 transition-all shadow-lg"
              title="Toggle Theme"
            >
              {theme === 'gold' ? <Sun className="w-5 h-5 brand-text" /> : <Moon className="w-5 h-5 text-zinc-400" />}
            </button>
            <button 
              onClick={() => setIsReportOpen(true)}
              className="p-2.5 bg-zinc-800 rounded-full border brand-border hover:bg-zinc-700 transition-all shadow-lg"
            >
              <PieChart className="w-5 h-5 brand-text" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 p-4 rounded-2xl border border-emerald-500/20 shadow-inner">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Revenue</span>
            </div>
            <div className="text-xl font-bold text-emerald-50">
              ${totals.revenue.toLocaleString()}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-2xl border border-rose-500/20 shadow-inner">
            <div className="flex items-center gap-2 text-rose-400 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Expenses</span>
            </div>
            <div className="text-xl font-bold text-rose-50">
              ${totals.expense.toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Recent Transactions</h2>
          <button className="text-xs brand-text font-bold flex items-center gap-1 hover:opacity-80 transition-colors">
            HISTORY <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 brand-border border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-zinc-500 text-sm">Loading your vault...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-20 text-center bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
              <p className="text-zinc-500 text-sm">Your ledger is empty.</p>
            </div>
          ) : (
            transactions.map((t) => (
              <motion.div 
                layout
                key={t.id}
                onClick={() => handleEdit(t)}
                className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 hover:brand-border transition-all shadow-xl group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                      t.type === 'revenue' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {t.type === 'revenue' ? <Plus className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-100">{t.category}</div>
                      <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{t.date}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`font-black text-lg mr-2 ${
                      t.type === 'revenue' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {t.type === 'revenue' ? '+' : '-'}${t.amount.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(t);
                        }}
                        className="p-2 text-zinc-400 hover:brand-text hover:brand-bg-soft rounded-xl transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDeleting(t.id!);
                        }}
                        className="p-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Delete Confirmation Overlay */}
        <AnimatePresence>
          {isDeleting !== null && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900 border brand-border p-8 rounded-[2rem] max-w-xs w-full text-center shadow-2xl"
              >
                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-display font-bold text-zinc-100 mb-2">Delete Entry?</h3>
                <p className="text-zinc-500 text-sm mb-8">This action cannot be undone. Are you sure?</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsDeleting(null)}
                    className="flex-1 py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-bold hover:bg-zinc-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(isDeleting)}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Breakdown */}
        <div className="mt-12">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Expense Distribution</h2>
          <div className="space-y-6">
            {categoryTotals.map(([cat, amount]) => (
              <div key={cat} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider">{cat}</span>
                  <span className="brand-text font-black">${amount.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: totals.expense > 0 ? `${(amount / totals.expense) * 100}%` : '0%' }}
                    className="h-full gold-gradient rounded-full brand-shadow"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* FAB */}
      <button 
        onClick={() => { resetForm(); setIsFormOpen(true); }}
        className="fixed bottom-8 right-8 w-16 h-16 gold-gradient text-zinc-950 rounded-2xl brand-shadow flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus className="w-8 h-8 font-bold" />
      </button>

      {/* Transaction Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl border-t brand-border"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-display font-bold gold-text-gradient">
                  {editingTransaction ? 'Edit Entry' : 'New Entry'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => { setType('expense'); setCategory(''); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                      type === 'expense' ? 'bg-zinc-800 brand-text shadow-lg' : 'text-zinc-600'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType('revenue'); setCategory(''); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                      type === 'revenue' ? 'bg-zinc-800 brand-text shadow-lg' : 'text-zinc-600'
                    }`}
                  >
                    Revenue
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">Amount</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 brand-text font-bold text-xl">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-6 pl-12 pr-12 text-3xl font-black text-zinc-100 focus:brand-border focus:ring-0 transition-all placeholder:text-zinc-800"
                    />
                    {amount && (
                      <button 
                        type="button"
                        onClick={() => setAmount('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-zinc-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">Category</label>
                    <select 
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-bold text-zinc-300 focus:brand-border focus:ring-0 appearance-none"
                    >
                      <option value="">Select...</option>
                      {CATEGORIES[type].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">Date</label>
                    <input 
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-bold text-zinc-300 focus:brand-border focus:ring-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">Note</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Reference details..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 pr-12 text-sm font-bold text-zinc-300 focus:brand-border focus:ring-0 placeholder:text-zinc-800"
                    />
                    {note && (
                      <button 
                        type="button"
                        onClick={() => setNote('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-zinc-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4">
                  <div className="flex gap-4">
                    {editingTransaction && (
                      <button
                        type="button"
                        onClick={() => setIsDeleting(editingTransaction.id!)}
                        className="flex-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 py-5 rounded-2xl font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-[2] gold-gradient text-zinc-950 py-5 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 brand-shadow"
                    >
                      <Save className="w-5 h-5" />
                      {editingTransaction ? 'Update Ledger' : 'Confirm Entry'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full py-3 text-zinc-600 text-[10px] font-bold uppercase tracking-widest hover:text-zinc-400 transition-colors"
                  >
                    Clear All Details
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Report Modal */}
      <AnimatePresence>
        {isReportOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-0 bg-zinc-950 z-[60] flex flex-col"
          >
            <header className="p-6 pt-12 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsReportOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 brand-text" />
                </button>
                <h2 className="text-2xl font-display font-bold gold-text-gradient">Financial Reports</h2>
              </div>
              <button 
                onClick={() => setIsClearingAll(true)}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {monthlyReport.length === 0 ? (
                <div className="text-center py-40">
                  <PieChart className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                  <p className="text-zinc-500 font-medium">No data to generate reports.</p>
                </div>
              ) : (
                monthlyReport.map(([month, data]) => {
                  const [year, monthNum] = month.split('-');
                  const dateObj = new Date(parseInt(year), parseInt(monthNum) - 1);
                  const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  
                  return (
                    <div key={month} className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-2xl">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="font-display font-bold text-xl text-zinc-100">
                          {monthName}
                        </h3>
                        <button 
                          onClick={() => handleExportCSV(month, data)}
                          className="p-2.5 bg-zinc-800 rounded-xl brand-text hover:opacity-80 border brand-border"
                          title="Export to CSV"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Revenue</span>
                          <span className="font-black text-emerald-400 text-xl">+${data.revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Expenses</span>
                          <span className="font-black text-rose-400 text-xl">-${data.expense.toLocaleString()}</span>
                        </div>
                        
                        {/* Category Breakdown for the month */}
                        {Object.keys(data.categories).length > 0 && (
                          <div className="py-4 border-t border-zinc-800/50 space-y-3">
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Top Expenses</p>
                            {Object.entries(data.categories)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 3)
                              .map(([cat, amt]) => (
                                <div key={cat} className="flex justify-between text-[11px]">
                                  <span className="text-zinc-400">{cat}</span>
                                  <span className="text-zinc-200 font-bold">${amt.toLocaleString()}</span>
                                </div>
                              ))}
                          </div>
                        )}

                        <div className="pt-6 border-t border-zinc-800 flex justify-between items-center">
                          <span className="text-xs font-black text-zinc-100 uppercase tracking-[0.2em]">Net Balance</span>
                          <span className={`font-black text-2xl ${data.revenue - data.expense >= 0 ? 'brand-text' : 'text-rose-500'}`}>
                            {data.revenue - data.expense >= 0 ? '+' : '-'}${Math.abs(data.revenue - data.expense).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
        {/* Clear All Confirmation Overlay */}
        <AnimatePresence>
          {isClearingAll && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900 border border-rose-500/30 p-8 rounded-[2.5rem] max-w-xs w-full text-center shadow-2xl"
              >
                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-display font-bold text-zinc-100 mb-2">Wipe Ledger?</h3>
                <p className="text-zinc-500 text-sm mb-8">This will permanently delete ALL your financial data. This cannot be undone.</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleClearAll}
                    className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                  >
                    Yes, Delete Everything
                  </button>
                  <button 
                    onClick={() => setIsClearingAll(false)}
                    className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-bold hover:bg-zinc-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
