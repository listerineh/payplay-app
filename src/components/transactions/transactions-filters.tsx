import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/context/i18n-context';

interface TransactionsFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: string[];
}

export const TransactionsFilters: React.FC<TransactionsFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
}) => {
  const { t } = useI18n();

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Input
        placeholder={t('transactions_history.search_placeholder')}
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
      />
      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('transactions_history.filter_type_placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('transactions_history.all_types')}</SelectItem>
          <SelectItem value="income">{t('add_transaction_dialog.type_income')}</SelectItem>
          <SelectItem value="expense">{t('add_transaction_dialog.type_expense')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('transactions_history.filter_category_placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {categories.map(c => <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
};
