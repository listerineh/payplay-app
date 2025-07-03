'use client';

import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import type { ChartConfig } from "@/components/ui/chart";
import { useAuth } from '@/context/auth-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';
import { useI18n } from '@/context/i18n-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { StatCard } from './dashboard/stat-card';
import { ExpenseBreakdown } from './dashboard/expense-breakdown';
import { RecentTransactions } from './dashboard/recent-transactions';

const chartConfig = {
  amount: { label: 'Amount' },
  Food: { label: 'Food', color: 'hsl(var(--chart-1))' },
  Transport: { label: 'Transport', color: 'hsl(var(--chart-2))' },
  Entertainment: { label: 'Entertainment', color: 'hsl(var(--chart-3))' },
  Utilities: { label: 'Utilities', color: 'hsl(var(--chart-4))' },
  Shopping: { label: 'Shopping', color: 'hsl(var(--chart-5))' },
  Health: { label: 'Health', color: 'hsl(var(--chart-1))' },
  Other: { label: 'Other', color: 'hsl(var(--chart-2))' },
  Income: { label: 'Income', color: 'hsl(var(--chart-3))' },
  NoExpenses: { label: 'No Expenses', color: 'hsl(var(--muted))' },
} satisfies ChartConfig;

const DashboardSkeleton = () => (
    <div className="flex flex-col gap-8 animate-pulse">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-10 rounded-lg" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-32" />
                    </CardContent>
                </Card>
            ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-3 md:order-2">
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <Skeleton className="mx-auto aspect-square max-h-[250px] w-full max-w-[250px] rounded-full" />
                    <div className="w-full space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </CardContent>
            </Card>
            <Card className="lg:col-span-4 md:order-1">
                <CardHeader className="flex flex-row items-center">
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <Skeleton className="h-5 w-2/5" />
                                <Skeleton className="h-5 w-1/5" />
                                <Skeleton className="h-5 w-1/5" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
);

export function Dashboard() {
    const { user } = useAuth();
    const { t, locale } = useI18n();
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all transactions for the user
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching transactions:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const { totalBalance, monthlyIncome, monthlyExpenses, expenseChartData, totalExpenses } = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense');
        const totalExp = expenses.reduce((acc, t) => acc + t.amount, 0);

        const balance = income - totalExp;

        const expenseData = expenses.reduce((acc, t) => {
            if (!acc[t.category]) acc[t.category] = 0;
            acc[t.category] += t.amount;
            return acc;
        }, {} as Record<string, number>);

        let chartData = [];
        if (Object.keys(expenseData).length === 0) {
            chartData = [{ category: 'No Expenses', amount: 1, fill: 'var(--color-NoExpenses)', percentage: 100 }];
        } else {
            chartData = Object.entries(expenseData).map(([category, amount]) => ({
                category,
                amount,
                percentage: totalExp > 0 ? (amount / totalExp) * 100 : 0,
                fill: `var(--color-${category})`,
            }));
        }
        
        return { 
            totalBalance: balance,
            monthlyIncome: income,
            monthlyExpenses: totalExp,
            expenseChartData: chartData,
            totalExpenses: totalExp
        };
    }, [transactions]);
    
    if (isLoading) {
        return <DashboardSkeleton />;
    }
    
    const currentLocale = locale === 'es' ? 'es-ES' : 'en-US';
    const statCards = [
      {
        title: t('dashboard.balance_card'),
        amount: `$${totalBalance.toLocaleString(currentLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: Wallet,
      },
      {
        title: t('dashboard.income_card'),
        amount: `$${monthlyIncome.toLocaleString(currentLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: ArrowUpRight,
      },
      {
        title: t('dashboard.expenses_card'),
        amount: `$${monthlyExpenses.toLocaleString(currentLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: ArrowDownLeft,
      },
    ];

  return (
    <>
      <div className="flex flex-col gap-8 animate-in fade-in-0 duration-500">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card, index) => (
            <StatCard key={index} {...card} />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <ExpenseBreakdown 
            chartData={expenseChartData}
            chartConfig={chartConfig}
            totalExpenses={totalExpenses}
          />
          <RecentTransactions transactions={transactions} />
        </div>
      </div>
    </>
  );
}
