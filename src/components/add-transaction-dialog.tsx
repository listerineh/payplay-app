
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, LoaderCircle, ArrowDown, ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/context/i18n-context';

const formSchema = z.object({
    description: z.string().min(2, 'Description must be at least 2 characters.'),
    amount: z.coerce.number().positive('Amount must be a positive number.'),
    type: z.enum(['expense', 'income']),
    category: z.string().min(1, { message: 'Please select a category.' }),
    date: z.date(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
}

const expenseCategories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Other'];
const incomeCategories = ['Income'];

export function AddTransactionDialog({ open, onOpenChange, onAddTransaction }: AddTransactionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t, locale } = useI18n();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: undefined,
      type: 'expense',
      category: '',
      date: new Date(),
    },
  });

  const transactionType = form.watch('type');

  useEffect(() => {
    if (transactionType === 'income') {
      form.setValue('category', 'Income');
    } else {
      // If the current category is 'Income', reset it when switching to 'expense'
      if (form.getValues('category') === 'Income') {
        form.setValue('category', '');
      }
    }
  }, [transactionType, form]);


  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await onAddTransaction({
        ...data,
        date: data.date.toISOString(),
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
        console.error("Failed to add transaction", error);
        toast({
            title: t('add_transaction_dialog.error_title'),
            description: t('add_transaction_dialog.error_description'),
            variant: "destructive"
        })
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
          description: '',
          amount: undefined,
          type: 'expense',
          category: '',
          date: new Date(),
      });
    }
    onOpenChange(isOpen);
  }

  const categories = transactionType === 'expense' ? expenseCategories : incomeCategories;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('add_transaction_dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('add_transaction_dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t('add_transaction_dialog.type_label')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <FormItem>
                        <RadioGroupItem value="expense" id="expense" className="sr-only" />
                        <Label htmlFor="expense" className={cn(
                            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                            field.value === 'expense' && "border-primary"
                        )}>
                          <ArrowDown className="mb-3 h-6 w-6 text-red-500" />
                          {t('add_transaction_dialog.type_expense')}
                        </Label>
                      </FormItem>
                      <FormItem>
                        <RadioGroupItem value="income" id="income" className="sr-only" />
                         <Label htmlFor="income" className={cn(
                            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                            field.value === 'income' && "border-primary"
                        )}>
                          <ArrowUp className="mb-3 h-6 w-6 text-green-500" />
                          {t('add_transaction_dialog.type_income')}
                        </Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('add_transaction_dialog.description_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Coffee with friends" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('add_transaction_dialog.amount_label')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="15.00" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('add_transaction_dialog.category_label')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={transactionType === 'income'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('add_transaction_dialog.category_label')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {t(`categories.${category}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('add_transaction_dialog.date_label')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: locale === 'es' ? es : undefined })
                            ) : (
                              <span>{t('add_transaction_dialog.pick_date')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={locale === 'es' ? es : undefined}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {t('add_transaction_dialog.saving_button')}
                  </>
                ) : (
                  t('add_transaction_dialog.save_button')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
