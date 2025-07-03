
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { SavingRoom, User } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/context/i18n-context';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  totalAmount: z.coerce.number().positive('Total amount must be positive.'),
  goal: z.string().optional(),
  paymentPeriod: z.enum(['one-time', 'hourly', 'weekly', 'bi-weekly', 'monthly', 'yearly']),
  participantIds: z.array(z.string()).min(0),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateSavingRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRoom: (room: SavingRoom) => Promise<void>;
}

export function CreateSavingRoomDialog({ open, onOpenChange, onAddRoom }: CreateSavingRoomDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      totalAmount: undefined,
      goal: '',
      paymentPeriod: 'one-time',
      participantIds: [],
    },
  });

  const paymentPeriod = form.watch('paymentPeriod');

  useEffect(() => {
    async function fetchUsers() {
      if (!currentUser) return;
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('uid', '!=', currentUser.uid));
      const userSnapshot = await getDocs(q);
      const userList = userSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.uid,
          name: data.displayName || 'No Name',
          avatarUrl: data.photoURL || `https://placehold.co/40x40.png?text=${(data.displayName || 'U').charAt(0)}`
        };
      });
      setAllUsers(userList);
    }
    if (open) {
        fetchUsers();
    }
  }, [currentUser, open]);


   useEffect(() => {
    if (currentUser) {
        form.reset({
            name: '',
            totalAmount: undefined,
            goal: '',
            paymentPeriod: 'one-time',
            participantIds: [],
        });
    }
  }, [currentUser, form, open]);

  const onSubmit = async (data: FormValues) => {
    if (!currentUser) {
      toast({ title: t('create_room_dialog.not_auth_title'), description: t('create_room_dialog.not_auth_desc'), variant: "destructive" });
      return;
    }
    
    setIsLoading(true);

    try {
        const creatorId = currentUser.uid;
        const finalParticipantIds = [...data.participantIds, creatorId];
        const amountPerParticipant = data.totalAmount;

        const usersSnapshot = await getDocs(query(collection(db, 'users'), where('uid', 'in', finalParticipantIds)));
        const participants = usersSnapshot.docs.map(doc => {
            const d = doc.data();
            return { id: d.uid, name: d.displayName, avatarUrl: d.photoURL || `https://placehold.co/40x40.png?text=${(d.displayName || 'U').charAt(0)}` };
        });

        if (participants.length === 0) {
          throw new Error("No participants found for the room.");
        }
        
        const totalRoomAmount = amountPerParticipant * participants.length;

        const newRoomData: Omit<SavingRoom, 'id'> = {
            name: data.name,
            creatorId: creatorId,
            totalAmount: totalRoomAmount,
            goal: data.goal,
            paymentPeriod: data.paymentPeriod,
            participants,
            participantIds: finalParticipantIds,
            payments: participants.map(p => ({
              userId: p.id,
              amountDue: amountPerParticipant,
              amountPaid: 0,
            })),
            discussion: [],
            createdAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, 'saving-rooms'), newRoomData);
      
      onAddRoom({ ...newRoomData, id: docRef.id });
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
        console.error("Error creating room: ", error);
        toast({ title: t('create_room_dialog.failed_title'), description: t('create_room_dialog.failed_desc'), variant: "destructive"})
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  }

  const amountLabel = paymentPeriod === 'one-time' 
    ? t('create_room_dialog.amount_label') 
    : t('create_room_dialog.amount_per_period_label');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('create_room_dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('create_room_dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>{t('create_room_dialog.name_label')}</FormLabel><FormControl><Input placeholder="e.g., Summer Trip" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="totalAmount" render={({ field }) => (
              <FormItem><FormLabel>{amountLabel}</FormLabel><FormControl><Input type="number" step="0.01" placeholder="1000.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="paymentPeriod" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('create_room_dialog.period_label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="one-time">{t('create_room_dialog.period_one_time')}</SelectItem>
                      <SelectItem value="hourly">{t('create_room_dialog.period_hourly')}</SelectItem>
                      <SelectItem value="weekly">{t('create_room_dialog.period_weekly')}</SelectItem>
                      <SelectItem value="bi-weekly">{t('create_room_dialog.period_bi_weekly')}</SelectItem>
                      <SelectItem value="monthly">{t('create_room_dialog.period_monthly')}</SelectItem>
                      <SelectItem value="yearly">{t('create_room_dialog.period_yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="goal" render={({ field }) => (
              <FormItem><FormLabel>{t('create_room_dialog.goal_label')}</FormLabel><FormControl><Textarea placeholder="e.g., Save for flights and hotel" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="participantIds" render={() => (
                <FormItem>
                    <div className="mb-4">
                        <FormLabel className="text-base">{t('create_room_dialog.participants_label')}</FormLabel>
                        <p className="text-sm text-muted-foreground">{t('create_room_dialog.participants_description')}</p>
                    </div>
                    <div className="space-y-3">
                        {allUsers.map(user => (
                            <FormField key={user.id} control={form.control} name="participantIds" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(user.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...field.value, user.id])
                                                    : field.onChange(field.value?.filter((value) => value !== user.id))
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">{user.name}</FormLabel>
                                </FormItem>
                            )} />
                        ))}
                    </div>
                    <FormMessage />
                </FormItem>
            )} />

            <DialogFooter className="pt-4 sticky bottom-0 bg-background">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('create_room_dialog.submit_button')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
