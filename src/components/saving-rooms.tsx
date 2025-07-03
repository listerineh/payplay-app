
'use client';

import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { SavingRoom } from '@/lib/types';
import { CreateSavingRoomDialog } from './create-saving-room-dialog';
import { useAuth } from '@/context/auth-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useI18n } from '@/context/i18n-context';
import { SavingRoomCard } from './saving-rooms/saving-room-card';

const SavingRoomsSkeleton = () => (
    <div className="flex flex-col gap-8 animate-pulse">
        <div className="flex items-center justify-end">
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="flex w-full flex-col">
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="mt-2 h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <div className="mb-4 space-y-2">
                            <div className="flex justify-between items-baseline mb-1">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-5 w-28" />
                            </div>
                            <Skeleton className="h-3 w-full rounded-full" />
                        </div>
                        <div className="mt-6 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <div className="flex items-center -space-x-2">
                                <Skeleton className="h-10 w-10 rounded-full border-2 border-background" />
                                <Skeleton className="h-10 w-10 rounded-full border-2 border-background" />
                                <Skeleton className="h-10 w-10 rounded-full border-2 border-background" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    </div>
);


export function SavingRooms() {
  const [rooms, setRooms] = useState<SavingRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    };

    setIsLoading(true);
    const q = query(collection(db, 'saving-rooms'), where('participantIds', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const roomsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SavingRoom));
        setRooms(roomsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching saving rooms: ", error);
        toast({ title: t('common.error'), description: t('saving_rooms.fetch_error_desc'), variant: "destructive"});
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast, t]);


  const handleAddRoom = async (newRoom: SavingRoom) => {
    toast({
        title: t('saving_rooms.created_toast_title'),
        description: t('saving_rooms.created_toast_desc'),
    })
  };

  if (isLoading) {
    return <SavingRoomsSkeleton />;
  }

  return (
    <>
    <CreateSavingRoomDialog
      open={isCreateOpen}
      onOpenChange={setIsCreateOpen}
      onAddRoom={handleAddRoom}
    />
    <div className="flex flex-col gap-8 animate-in fade-in-0 duration-500">
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('saving_rooms.create_button')}
        </Button>
      </div>
      
      {rooms.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => (
                <SavingRoomCard key={room.id} room={room} />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-24 text-center">
            <h3 className="text-xl font-semibold">{t('saving_rooms.no_rooms_title')}</h3>
            <p className="text-muted-foreground mt-2">{t('saving_rooms.no_rooms_desc')}</p>
        </div>
      )}
    </div>
    </>
  );
}
