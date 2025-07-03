import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/lib/types';
import { useI18n } from '@/context/i18n-context';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransactionsTableProps {
  transactions: Transaction[];
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions }) => {
  const { t, locale } = useI18n();
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('transactions_history.header_description')}</TableHead>
          <TableHead>{t('transactions_history.header_date')}</TableHead>
          <TableHead>{t('transactions_history.header_category')}</TableHead>
          <TableHead>{t('transactions_history.header_type')}</TableHead>
          <TableHead className="text-right">{t('transactions_history.header_amount')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length > 0 ? transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="font-medium">{transaction.description}</TableCell>
            <TableCell className="whitespace-nowrap">{format(new Date(transaction.date), 'PPP', { locale: locale === 'es' ? es : undefined })}</TableCell>
            <TableCell>
              <Badge variant="outline">{t(`categories.${transaction.category}`)}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                {t(`add_transaction_dialog.type_${transaction.type}`)}
              </Badge>
            </TableCell>
            <TableCell className={`text-right font-semibold whitespace-nowrap ${transaction.type === 'income' ? 'text-green-500' : ''}`}>
              {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <p className="font-semibold">{t('transactions_history.no_filtered_transactions')}</p>
                <p className="text-sm text-muted-foreground">{t('transactions_history.no_filtered_transactions_desc')}</p>
              </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
