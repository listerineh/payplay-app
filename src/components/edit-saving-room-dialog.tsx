
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SavingRoom, ParticipantPayment, User } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/context/i18n-context';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Avatar, AvatarFallback } from './ui/avatar';
import Image from 'next/image';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  goal: z.string().optional(),
  participantIds: z.array(z.string()).min(1, 'At least one participant is required.'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditSavingRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: SavingRoom;
  onUpdateRoom: (updatedData: Partial<SavingRoom>) => Promise<void>;
}

export function EditSavingRoomDialog({ open, onOpenChange, room, onUpdateRoom }: EditSavingRoomDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: room.name,
      goal: room.goal,
      participantIds: room.participantIds,
    },
  });

  useEffect(() => {
    async function fetchUsers() {
      if (!currentUser) return;
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
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
    if (room && open) {
        form.reset({
            name: room.name,
            goal: room.goal,
            participantIds: room.participantIds
        });
        setSearchTerm('');
    }
  }, [room, open, form]);

  const onSubmit = async (data: FormValues) => {
    if (!currentUser || currentUser.uid !== room.creatorId) {
      toast({ title: t('common.error'), description: "You are not authorized to edit this room.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);

    try {
        const amountPerParticipant = room.payments[0]?.amountDue;
        if (!amountPerParticipant) {
            toast({ title: t('common.error'), description: "Could not determine amount per participant.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const finalParticipantIds = [...data.participantIds];
        if (!finalParticipantIds.includes(room.creatorId)) {
            finalParticipantIds.push(room.creatorId);
        }

        const newParticipants = allUsers.filter(u => finalParticipantIds.includes(u.id));
        const newTotalRoomAmount = amountPerParticipant * newParticipants.length;

        const newPayments: ParticipantPayment[] = newParticipants.map(p => {
            const existingPayment = room.payments.find(pmt => pmt.userId === p.id);
            return {
                userId: p.id,
                amountDue: amountPerParticipant,
                amountPaid: existingPayment?.amountPaid ?? 0,
            };
        });

        const updatedRoomData = {
            name: data.name,
            goal: data.goal,
            participants: newParticipants,
            participantIds: finalParticipantIds,
            payments: newPayments,
            totalAmount: newTotalRoomAmount,
      };
      
      await onUpdateRoom(updatedRoomData);
      
      onOpenChange(false);
    } catch (error) {
        console.error("Error updating room: ", error);
        toast({ title: t('common.error'), description: "Failed to update room details.", variant: "destructive"})
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
        name: room.name,
        goal: room.goal,
        participantIds: room.participantIds
      });
      setSearchTerm('');
    }
    onOpenChange(isOpen);
  }

  const currentParticipantsInForm = allUsers.filter(u => form.getValues('participantIds').includes(u.id));
  
  const usersNotYetInRoom = allUsers.filter(u => !form.getValues('participantIds').includes(u.id));
  const availableUsersToAdd = usersNotYetInRoom.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('edit_room_dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('edit_room_dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="max-h-[70vh] p-1 pr-4">
              <div className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t('create_room_dialog.name_label')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="goal" render={({ field }) => (
                  <FormItem><FormLabel>{t('create_room_dialog.goal_label')}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="participantIds" render={({ field }) => (
                    <FormItem>
                        <div className="mb-2">
                            <FormLabel className="text-base">{t('create_room_dialog.participants_label')}</FormLabel>
                        </div>
                        <div className="rounded-md border p-2 space-y-3">
                            <TooltipProvider>
                            {currentParticipantsInForm.map(user => (
                                <div key={user.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-8">
                                            <Image src={user.avatarUrl} alt={user.name} width={32} height={32} data-ai-hint="person" />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-normal">{user.name}</span>
                                    </div>
                                    {user.id !== room.creatorId && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="size-7"
                                              onClick={() => {
                                                  field.onChange(field.value?.filter((id) => id !== user.id))
                                              }}
                                          >
                                              <X className="size-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{t('edit_room_dialog.remove_participant_tooltip')}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                </div>
                            ))}
                            </TooltipProvider>

                            {usersNotYetInRoom.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">Add More People</h4>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            )}

                            {availableUsersToAdd.map(user => (
                                <FormItem key={user.id} className="flex flex-row items-center space-x-3 space-y-0 pt-1">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(user.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), user.id])
                                                    : field.onChange(field.value?.filter((value) => value !== user.id))
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">{user.name}</FormLabel>
                                </FormItem>
                            ))}
                            {usersNotYetInRoom.length > 0 && availableUsersToAdd.length === 0 && searchTerm && (
                                <p className="text-center text-sm text-muted-foreground py-2">No users found.</p>
                            )}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('edit_room_dialog.save_button')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
