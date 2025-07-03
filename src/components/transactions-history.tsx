
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Transaction } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';
import { useI18n } from '@/context/i18n-context';
import { TransactionsFilters } from './transactions/transactions-filters';
import { TransactionsTable } from './transactions/transactions-table';

const TransactionsHistorySkeleton = () => (
    <div className="flex flex-col gap-8 animate-pulse">
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="mt-2 h-4 w-full max-w-lg" />
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-16" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(8)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
);

export function TransactionsHistory() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = [
    'All', 'Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Income', 'Other'
  ];
  
  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const transData: Transaction[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Transaction));
        
        setTransactions(transData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching transactions:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t => categoryFilter === 'All' || t.category === categoryFilter);
  }, [transactions, searchTerm, typeFilter, categoryFilter]);

  if (isLoading) {
    return <TransactionsHistorySkeleton />;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-0 duration-500">
      <Card>
        <CardHeader>
          <CardTitle>{t('transactions_history.title')}</CardTitle>
          <CardDescription>{t('transactions_history.description')}</CardDescription>
          <TransactionsFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categories={categories}
          />
        </CardHeader>
        <CardContent>
          <TransactionsTable transactions={filteredTransactions} />
        </CardContent>
      </Card>
    </div>
  );
}
