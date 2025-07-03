
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { User } from '@/lib/types';
import { useI18n } from '@/context/i18n-context';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: User | null;
  onRecordPayment: (amount: number) => void;
  amountDue: number;
  roomName: string;
}

export function RecordPaymentDialog({ open, onOpenChange, participant, onRecordPayment, amountDue, roomName }: RecordPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useI18n();

  const formSchema = useMemo(() => {
    return z.object({
      amount: z.coerce.number()
        .positive({ message: t('record_payment_dialog.error_positive_amount') })
        .max(amountDue, { message: t('record_payment_dialog.error_amount_too_high') })
    });
  }, [amountDue, t]);
  
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ amount: amountDue > 0 ? parseFloat(amountDue.toFixed(2)) : undefined });
    }
  }, [open, amountDue, form]);

  const onSubmit = (data: FormValues) => {
    setIsLoading(true);
    onRecordPayment(data.amount);
    setIsLoading(false);
    onOpenChange(false);
    form.reset();
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('record_payment_dialog.title', { name: participant?.name || '' })}</DialogTitle>
          <DialogDescription>
            {t('record_payment_dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('record_payment_dialog.amount_label')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="50.00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {t('record_payment_dialog.saving_button')}
                  </>
                ) : (
                  t('record_payment_dialog.save_button')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
