
'use client';

import { useState, useEffect, useMemo, type FC } from 'react';
import type { SavingRoom, ParticipantPayment, User, Comment, Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";
import { useAuth } from '@/context/auth-context';
import { RecordPaymentDialog } from './record-payment-dialog';
import { format, formatDistanceToNow, addWeeks, addMonths, addYears, startOfWeek, getWeek, getYear, startOfDay, isAfter, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { doc, updateDoc, arrayUnion, deleteDoc, onSnapshot, addDoc, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/context/i18n-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Edit, MoreVertical, Trash2, LoaderCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { EditSavingRoomDialog } from './edit-saving-room-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';

// Types
interface SavingRoomDetailsProps {
  initialRoom: SavingRoom;
}

type Period = {
  key: string;
  label: string;
  dueDate: Date;
};

type ParticipantStatus = { text: string; className: string; };

// Helper Functions
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

const getPeriods = (room: SavingRoom, locale: 'en' | 'es'): Period[] => {
  if (room.paymentPeriod === 'one-time' || !room.createdAt) return [];

  const periods: Period[] = [];
  const isHourly = room.paymentPeriod === 'hourly';
  const roomStartDate = isHourly ? new Date(room.createdAt) : startOfDay(new Date(room.createdAt));
  let currentDate = roomStartDate;
  const today = isHourly ? new Date() : startOfDay(new Date());
  const dateLocale = locale === 'es' ? es : undefined;

  while (!isAfter(currentDate, today)) {
    let period;
    switch (room.paymentPeriod) {
      case 'hourly':
        period = { key: format(currentDate, 'yyyy-MM-dd-HH'), label: format(currentDate, 'MMM d, h a', { locale: dateLocale }), dueDate: new Date(currentDate) };
        currentDate = addHours(currentDate, 1);
        break;
      case 'monthly':
        period = { key: format(currentDate, 'yyyy-MM'), label: format(currentDate, 'MMMM yyyy', { locale: dateLocale }), dueDate: new Date(currentDate) };
        currentDate = addMonths(currentDate, 1);
        break;
      case 'yearly':
        period = { key: format(currentDate, 'yyyy'), label: format(currentDate, 'yyyy', { locale: dateLocale }), dueDate: new Date(currentDate) };
        currentDate = addYears(currentDate, 1);
        break;
      case 'weekly':
        const weekYearW = getYear(startOfWeek(currentDate, { weekStartsOn: 1 }));
        const weekW = getWeek(currentDate, { weekStartsOn: 1 });
        period = { key: `${weekYearW}-W${weekW}`, label: `Week ${weekW}, ${weekYearW}`, dueDate: new Date(currentDate) };
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'bi-weekly':
        const weekYearB = getYear(startOfWeek(currentDate, { weekStartsOn: 1 }));
        const weekB = getWeek(currentDate, { weekStartsOn: 1 });
        period = { key: `${weekYearB}-W${weekB}`, label: `Bi-Weekly from ${format(currentDate, 'MMM d')}`, dueDate: new Date(currentDate) };
        currentDate = addWeeks(currentDate, 2);
        break;
      default: break;
    }
    if (period) periods.push(period);
    else break;
  }
  return periods;
};


// Sub-components for SavingRoomDetails

const RoomDetailsHeader: FC<{ room: SavingRoom; isCreator: boolean; onEdit: () => void; onDelete: () => void; t: TFunction; }> = 
({ room, isCreator, onEdit, onDelete, t }) => (
  <CardHeader>
    <div className="flex items-start justify-between">
      <div>
        <CardTitle className="font-headline text-3xl">{room.name}</CardTitle>
        {room.goal && <CardDescription>{room.goal}</CardDescription>}
      </div>
      {isCreator && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" /><span>{t('edit_room_dialog.title')}</span></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" /><span>{t('delete_room_dialog.title')}</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  </CardHeader>
);

const RoomDetailsContent: FC<{ totalPaidAmount: number; totalDueToDate: number; progress: number; currentLocale: string; t: TFunction; room: SavingRoom; timeLapse: { progress: number; remaining: string; }; }> = 
({ totalPaidAmount, totalDueToDate, progress, currentLocale, t, room, timeLapse }) => (
  <CardContent>
    <div className="mb-6">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-muted-foreground">{t('saving_room_details.overall_progress')}</span>
        <span className="font-semibold text-xl">${totalPaidAmount.toLocaleString(currentLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / <span className="text-muted-foreground">${totalDueToDate.toLocaleString(currentLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
      </div>
      <Progress value={progress} className="h-3" />
    </div>
    {room.paymentPeriod !== 'one-time' && (
      <div className="my-6">
        <div className="flex justify-end items-baseline mb-2"><span className="text-sm font-medium text-muted-foreground">{timeLapse.remaining}</span></div>
        <Progress value={timeLapse.progress} className="h-2" />
      </div>
    )}
  </CardContent>
);

const ContributionChart: FC<{ chartData: any[]; chartConfig: ChartConfig; isMobile: boolean | undefined; locale: 'en' | 'es'; t: TFunction; }> =
({ chartData, chartConfig, isMobile, locale, t }) => {
    if (isMobile === undefined) {
        return <div className="space-y-4 pt-4 min-h-[250px] flex flex-col justify-center"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
    }
    if (isMobile) {
        return (
            <div className="space-y-5">
                {chartData.map((data, index) => (
                    <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center text-sm"><span className="font-medium truncate pr-4">{data.name}</span><span className="text-muted-foreground flex-shrink-0">${data.paid.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')} / ${data.total.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')}</span></div>
                        <Progress value={data.total > 0 ? (data.paid / data.total) * 100 : 0} className="h-2" />
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="overflow-x-auto">
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full min-w-[400px]">
                <BarChart data={chartData.map(d => ({ ...d, name: d.name.split(' ')[0] }))} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" width={80} tickFormatter={(value) => value.length > 8 ? `${value.substring(0, 8)}...` : value} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Legend wrapperStyle={{ paddingBottom: '20px' }} />
                    <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" radius={[4, 4, 4, 4]} />
                    <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[4, 4, 4, 4]} />
                </BarChart>
            </ChartContainer>
        </div>
    );
};

const ParticipantsList: FC<{ room: SavingRoom; periods: Period[]; getParticipantStatus: (payment: ParticipantPayment, totalDue: number) => ParticipantStatus; isCreator: boolean; onOpenRecordDialog: (p: User) => void; t: TFunction; }> =
({ room, periods, getParticipantStatus, isCreator, onOpenRecordDialog, t }) => (
    <div className="space-y-4 overflow-x-auto">
        {room.participants.map(participant => {
            const payment = room.payments.find(p => p.userId === participant.id);
            if (!payment) return null;
            const amountDueForParticipant = room.paymentPeriod === 'one-time' ? payment.amountDue : round(payment.amountDue * periods.length);
            const status = getParticipantStatus(payment, amountDueForParticipant);
            return (
                <div key={participant.id} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar><Image src={participant.avatarUrl} alt={participant.name} width={40} height={40} data-ai-hint="person"/><AvatarFallback>{participant.name.charAt(0)}</AvatarFallback></Avatar>
                        <div className='flex flex-col'><span className="font-medium">{participant.name}</span><span className="text-xs text-muted-foreground">${payment.amountPaid.toFixed(2)} / ${amountDueForParticipant.toFixed(2)}</span></div>
                    </div>
                    <div className="flex items-center justify-end gap-2 sm:shrink-0">
                        <Badge variant={status.text === t('saving_room_details.payment_status_pending') ? 'secondary' : 'default'} className={`${status.className} shrink-0`}>{status.text}</Badge>
                        {isCreator && status.text !== t('saving_room_details.payment_status_paid') && (<Button size="sm" variant="outline" onClick={() => onOpenRecordDialog(participant)} className="shrink-0">{t('saving_room_details.log_pay_button')}</Button>)}
                    </div>
                </div>
            );
        })}
    </div>
);

const PaymentBreakdownAccordion: FC<{ room: SavingRoom; periods: Period[]; breakdownData: Record<string, any>; t: TFunction; }> =
({ room, periods, breakdownData, t }) => (
    <Accordion type="multiple" className="w-full">
        {room.participants.map(participant => {
            const participantPayment = room.payments.find(p => p.userId === participant.id);
            if (!participantPayment) return null;
            const totalDueToDate = round(participantPayment.amountDue * periods.length);
            return (
                <AccordionItem key={participant.id} value={participant.id}>
                    <AccordionTrigger>
                        <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3"><Avatar><Image src={participant.avatarUrl} alt={participant.name} width={40} height={40} data-ai-hint="person"/><AvatarFallback>{participant.name.charAt(0)}</AvatarFallback></Avatar><span className="font-medium">{participant.name}</span></div>
                            <div className="text-right"><div className="text-sm font-semibold">${participantPayment.amountPaid.toFixed(2)}<span className="text-muted-foreground"> / ${totalDueToDate.toFixed(2)}</span></div><div className="text-xs text-muted-foreground">{t('saving_room_details.total_paid')} / {t('saving_room_details.total_due')}</div></div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Table><TableHeader><TableRow><TableHead>{t('saving_room_details.period_header')}</TableHead><TableHead className="text-right">{t('saving_room_details.due_header')}</TableHead><TableHead className="text-right">{t('saving_room_details.paid_header')}</TableHead><TableHead className="text-right">{t('saving_room_details.balance_header')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {breakdownData[participant.id]?.map((period: any) => (
                                    <TableRow key={period.key}><TableCell className="font-medium">{period.label}</TableCell><TableCell className="text-right">${period.due.toFixed(2)}</TableCell><TableCell className="text-right text-green-500">${period.paid.toFixed(2)}</TableCell><TableCell className={`text-right font-semibold ${period.balance > 0 ? 'text-destructive' : ''}`}>${period.balance.toFixed(2)}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
            );
        })}
    </Accordion>
);

const PaymentHistoryTable: FC<{ paymentHistory: Transaction[]; room: SavingRoom; locale: string; t: TFunction; }> =
({ paymentHistory, room, locale, t }) => (
    <Table>
        <TableHeader><TableRow><TableHead>{t('saving_room_details.history_participant_header')}</TableHead><TableHead>{t('saving_room_details.history_amount_header')}</TableHead><TableHead className='text-right'>{t('saving_room_details.history_date_header')}</TableHead></TableRow></TableHeader>
        <TableBody>
            {paymentHistory.length > 0 ? (
                paymentHistory.map(item => {
                    const participant = room.participants.find(p => p.id === item.userId);
                    return (<TableRow key={item.id}><TableCell className="font-medium">{participant?.name ?? 'Unknown'}</TableCell><TableCell className='text-green-500 font-semibold'>${item.amount.toFixed(2)}</TableCell><TableCell className="text-right text-muted-foreground">{format(new Date(item.date), 'PP p', { locale: locale === 'es' ? es : undefined })}</TableCell></TableRow>)
                })
            ) : (<TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">{t('saving_room_details.no_payments_recorded')}</TableCell></TableRow>)}
        </TableBody>
    </Table>
);

const DiscussionSection: FC<{ room: SavingRoom; newComment: string; setNewComment: (c: string) => void; isPostingComment: boolean; onPostComment: () => void; locale: string; t: TFunction; }> =
({ room, newComment, setNewComment, isPostingComment, onPostComment, locale, t }) => (
    <>
        <div className="space-y-4">
            <Textarea placeholder={t('saving_room_details.discussion_placeholder')} value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={isPostingComment} />
            <Button onClick={onPostComment} disabled={isPostingComment}>{isPostingComment && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{isPostingComment ? t('saving_room_details.post_comment_button_loading') : t('saving_room_details.post_comment_button')}</Button>
        </div>
        <div className="mt-6 space-y-4">
            {(room.discussion && room.discussion.length > 0) ? (
                [...room.discussion].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(comment => (
                    <div key={comment.id} className="flex items-start gap-3">
                        <Avatar><Image src={comment.userAvatar} alt={comment.userName} width={40} height={40} data-ai-hint="person"/><AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback></Avatar>
                        <div className="w-full rounded-lg border bg-card p-3"><div className="flex items-center justify-between"><p className="font-semibold">{comment.userName}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: locale === 'es' ? es : undefined })}</p></div><p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p></div>
                    </div>
                ))
            ) : (<div className="text-center text-muted-foreground py-8">{t('saving_room_details.no_comments')}</div>)}
        </div>
    </>
);


// Main Component
export function SavingRoomDetails({ initialRoom }: SavingRoomDetailsProps) {
  const [room, setRoom] = useState<SavingRoom>(initialRoom);
  const [roomExists, setRoomExists] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<Transaction[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<User | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [timeLapse, setTimeLapse] = useState({ progress: 0, remaining: '' });
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (!initialRoom.id) return;
    const roomRef = doc(db, 'saving-rooms', initialRoom.id);
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const roomData = { id: doc.id, ...doc.data() } as SavingRoom;
        if (!roomData.discussion) roomData.discussion = [];
        setRoom(roomData);
        setRoomExists(true);
      } else {
        setRoomExists(false);
      }
    });
    return () => unsubscribe();
  }, [initialRoom.id]);

  useEffect(() => {
    if (!room.id) return;
    const q = query(collection(db, 'transactions'), where('roomId', '==', room.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      historyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPaymentHistory(historyData);
    });
    return () => unsubscribe();
  }, [room.id]);
  
  useEffect(() => {
    if (room.paymentPeriod === 'one-time' || !room.createdAt) {
      setTimeLapse({ progress: 0, remaining: '' });
      return;
    };
    const calculate = () => {
        const now = new Date();
        let addPeriod: (date: Date, count: number) => Date;
        switch (room.paymentPeriod) {
            case 'hourly': addPeriod = addHours; break;
            case 'weekly': addPeriod = addWeeks; break;
            case 'bi-weekly': addPeriod = (date, count) => addWeeks(date, count * 2); break;
            case 'monthly': addPeriod = addMonths; break;
            case 'yearly': addPeriod = addYears; break;
            default: return;
        }
        let periodStart = new Date(room.createdAt);
        let periodEnd = addPeriod(periodStart, 1);
        while (periodEnd < now) {
            periodStart = periodEnd;
            periodEnd = addPeriod(periodStart, 1);
        }
        const totalDuration = periodEnd.getTime() - periodStart.getTime();
        const elapsed = now.getTime() - periodStart.getTime();
        const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
        const dateLocale = locale === 'es' ? es : undefined;
        const remainingText = formatDistanceToNow(periodEnd, { addSuffix: true, locale: dateLocale });
        setTimeLapse({ progress, remaining: remainingText.charAt(0).toUpperCase() + remainingText.slice(1) });
    };
    calculate();
    const intervalId = setInterval(calculate, 30000);
    return () => clearInterval(intervalId);
  }, [room.paymentPeriod, room.createdAt, locale]);

  const periods = useMemo(() => getPeriods(room, locale), [room, locale]);
  const isCreator = user && room.creatorId === user.uid;
  const currentLocale = locale === 'es' ? 'es-ES' : 'en-US';

  const getParticipantStatus = (payment: ParticipantPayment, totalDue: number): ParticipantStatus => {
    if (totalDue > 0 && payment.amountPaid >= totalDue) return { text: t('saving_room_details.payment_status_paid'), className: 'bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-400' };
    if (payment.amountPaid > 0) return { text: t('saving_room_details.payment_status_partially'), className: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:text-yellow-400' };
    return { text: t('saving_room_details.payment_status_pending'), className: '' };
  };

  const { totalDueToDate, totalPaidAmount, progress } = useMemo(() => {
    const paid = room.payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const amountPerPeriod = room.payments[0]?.amountDue * room.participants.length || room.totalAmount;
    let due = room.paymentPeriod === 'one-time' ? amountPerPeriod : round(amountPerPeriod * periods.length);
    const prog = due > 0 ? (paid / due) * 100 : 0;
    return { totalDueToDate: due, totalPaidAmount: paid, progress: prog };
  }, [room, periods]);
  
  const chartData = useMemo(() => {
    return room.participants.map(participant => {
        const payment = room.payments.find(p => p.userId === participant.id);
        const totalDue = room.paymentPeriod === 'one-time' ? payment?.amountDue ?? 0 : round((payment?.amountDue ?? 0) * periods.length);
        const paid = payment?.amountPaid ?? 0;
        const pending = Math.max(0, totalDue - paid);
        return { name: participant.name, paid: round(paid), pending: round(pending), total: round(totalDue) };
    });
  }, [room, periods]);
  
  const chartConfig = {
    paid: { label: t('saving_room_details.payment_status_paid'), color: "hsl(var(--chart-1))" },
    pending: { label: t('saving_room_details.payment_status_pending'), color: "hsl(var(--muted))" },
  } satisfies ChartConfig;

  const handleOpenRecordDialog = (participant: User) => {
    setSelectedParticipant(participant);
    setIsRecordPaymentOpen(true);
  };

  const handleRecordPayment = async (amount: number) => {
    if (!selectedParticipant || !user || !isCreator) return;
    const roomRef = doc(db, 'saving-rooms', room.id);
    const newPayments = room.payments.map(p => p.userId === selectedParticipant.id ? { ...p, amountPaid: round(p.amountPaid + amount) } : p);
    try {
      await addDoc(collection(db, 'transactions'), { userId: selectedParticipant.id, description: `Payment for "${room.name}"`, amount: amount, type: 'expense', category: 'Other', date: new Date().toISOString(), roomId: room.id, });
      await updateDoc(roomRef, { payments: newPayments });
      toast({ title: t('saving_room_details.payment_recorded_toast'), description: t('saving_room_details.payment_recorded_toast_desc')});
    } catch (e) {
      console.error("Error recording payment: ", e);
      toast({ title: t('common.error'), description: t('saving_room_details.error_record_payment'), variant: "destructive" });
    }
  };

  const handleUpdateRoom = async (updatedData: Partial<SavingRoom>) => {
    const roomRef = doc(db, 'saving-rooms', room.id);
    try {
      await updateDoc(roomRef, updatedData);
      toast({ title: t('dashboard.success_title'), description: t('saving_room_details.update_room_success') });
    } catch (error) {
      console.error("Error updating room: ", error);
      toast({ title: t('common.error'), description: "Failed to update room details.", variant: "destructive" });
    }
  };

  const handleDeleteRoom = async () => {
    const roomRef = doc(db, 'saving-rooms', room.id);
    try {
      await deleteDoc(roomRef);
      toast({ title: t('dashboard.success_title'), description: t('saving_room_details.delete_room_success') });
      router.push('/saving-rooms');
    } catch (error) {
      console.error("Error deleting room: ", error);
      toast({ title: t('common.error'), description: "Failed to delete room.", variant: "destructive" });
    }
  };

  const handlePostComment = async () => {
    if (!user) { toast({ title: t('common.error'), description: t('saving_room_details.comment_login_error'), variant: "destructive" }); return; }
    if (!newComment.trim()) { toast({ title: t('common.error'), description: t('saving_room_details.comment_empty_error'), variant: "destructive" }); return; }
    setIsPostingComment(true);
    const roomRef = doc(db, 'saving-rooms', room.id);
    const comment: Comment = { id: `c${Date.now()}`, userId: user.uid, userName: user.displayName || 'Anonymous', userAvatar: user.photoURL || `https://placehold.co/40x40.png?text=${(user.displayName || 'A').charAt(0)}`, text: newComment, createdAt: new Date().toISOString(), };
    try {
      await updateDoc(roomRef, { discussion: arrayUnion(comment) });
      setNewComment('');
      toast({ title: t('dashboard.success_title'), description: t('saving_room_details.comment_posted_success') });
    } catch (e) {
      console.error("Error posting comment: ", e);
      toast({ title: t('common.error'), description: t('saving_room_details.comment_posted_error'), variant: "destructive" });
    } finally {
      setIsPostingComment(false);
    }
  };
  
  const selectedParticipantPayment = room.payments.find(p => p.userId === selectedParticipant?.id);
  const amountStillOwed = useMemo(() => {
    if (!selectedParticipantPayment) return 0;
    const totalDue = room.paymentPeriod === 'one-time' ? selectedParticipantPayment.amountDue : round(selectedParticipantPayment.amountDue * periods.length);
    return round(Math.max(0, totalDue - selectedParticipantPayment.amountPaid));
  }, [selectedParticipantPayment, room.paymentPeriod, periods]);


  const breakdownData = useMemo(() => {
    const data: Record<string, any> = {};
    if (room.paymentPeriod === 'one-time') return data;
    room.participants.forEach(p => {
        const payment = room.payments.find(pmt => pmt.userId === p.id);
        if (!payment) return;
        const amountDuePerPeriod = payment.amountDue;
        let remainingPaymentPool = round(payment.amountPaid);
        data[p.id] = periods.map(period => {
            const paidForPeriod = round(Math.min(remainingPaymentPool, amountDuePerPeriod));
            remainingPaymentPool = round(remainingPaymentPool - paidForPeriod);
            return { ...period, due: amountDuePerPeriod, paid: paidForPeriod, balance: round(amountDuePerPeriod - paidForPeriod), };
        });
    });
    return data;
  }, [room, periods]);

  if (!roomExists) {
    return <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-24 text-center"><h3 className="text-xl font-semibold">{t('saving_room_details.not_found')}</h3><Link href="/saving-rooms" className="mt-4"><Button variant="outline">Back to Rooms</Button></Link></div>
  }

  return (
    <>
      <RecordPaymentDialog 
        open={isRecordPaymentOpen} 
        onOpenChange={setIsRecordPaymentOpen} 
        participant={selectedParticipant} 
        onRecordPayment={handleRecordPayment} 
        amountDue={amountStillOwed}
        roomName={room.name}
      />
      {isCreator && (<EditSavingRoomDialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen} room={room} onUpdateRoom={handleUpdateRoom} />)}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('delete_room_dialog.title')}</AlertDialogTitle><AlertDialogDescription>{t('delete_room_dialog.description')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('delete_room_dialog.cancel_button')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive hover:bg-destructive/90">{t('delete_room_dialog.confirm_button')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <div className="flex flex-col gap-8 animate-in fade-in-0 duration-500">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <RoomDetailsHeader room={room} isCreator={isCreator} onEdit={() => setIsEditRoomOpen(true)} onDelete={() => setIsDeleteAlertOpen(true)} t={t} />
                <RoomDetailsContent totalPaidAmount={totalPaidAmount} totalDueToDate={totalDueToDate} progress={progress} currentLocale={currentLocale} t={t} room={room} timeLapse={timeLapse}/>
            </Card>
            <Card>
                <CardHeader><CardTitle className="font-headline">{t('saving_room_details.participants')}</CardTitle></CardHeader>
                <CardContent>
                  <ParticipantsList room={room} periods={periods} getParticipantStatus={getParticipantStatus} isCreator={isCreator} onOpenRecordDialog={handleOpenRecordDialog} t={t} />
                </CardContent>
            </Card>
        </div>
        
        <Card>
          <CardHeader><CardTitle className="font-headline">{t('saving_room_details.contribution_status')}</CardTitle></CardHeader>
          <CardContent><ContributionChart chartData={chartData} chartConfig={chartConfig} isMobile={isMobile} locale={locale} t={t} /></CardContent>
        </Card>

        {room.paymentPeriod !== 'one-time' && (
            <Card>
                <CardHeader><CardTitle className="font-headline">{t('saving_room_details.payment_breakdown_title')}</CardTitle><CardDescription>{t('saving_room_details.payment_breakdown_desc')}</CardDescription></CardHeader>
                <CardContent><PaymentBreakdownAccordion room={room} periods={periods} breakdownData={breakdownData} t={t} /></CardContent>
            </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle className="font-headline">{t('saving_room_details.payment_history_title')}</CardTitle><CardDescription>{t('saving_room_details.payment_history_desc')}</CardDescription></CardHeader>
                <CardContent><PaymentHistoryTable paymentHistory={paymentHistory} room={room} locale={locale} t={t} /></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="font-headline">{t('saving_room_details.discussion_title')}</CardTitle><CardDescription>{t('saving_room_details.discussion_desc')}</CardDescription></CardHeader>
                <CardContent><DiscussionSection room={room} newComment={newComment} setNewComment={setNewComment} isPostingComment={isPostingComment} onPostComment={handlePostComment} locale={locale} t={t} /></CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

// Redefine TFunction as it's not exported from i18n-context
type TFunction = (key: string, params?: Record<string, string | number>) => string;
