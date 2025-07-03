
'use client'

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Skeleton } from '@/components/ui/skeleton'
import { PlusCircle, Users, Split } from 'lucide-react'
import { AppNavbar } from '@/components/app-sidebar'
import { AddTransactionDialog } from '@/components/add-transaction-dialog'
import { CreateSavingRoomDialog } from '@/components/create-saving-room-dialog'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/context/i18n-context'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Transaction, SavingRoom } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = React.useState(false);
  const [isCreateSavingRoomOpen, setIsCreateSavingRoomOpen] = React.useState(false);
  const [isCreateSharedExpenseOpen, setIsCreateSharedExpenseOpen] = React.useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = React.useState(false);
  
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleAddTransaction = async (newTransaction: Omit<Transaction, 'id'>) => {
    if (!user) {
        toast({ title: t('common.error'), description: "You must be logged in to add a transaction.", variant: "destructive" });
        return;
    };

    try {
        await addDoc(collection(db, 'transactions'), {
            ...newTransaction,
            userId: user.uid,
            createdAt: serverTimestamp()
        });
        setIsAddTransactionOpen(false);
        toast({ title: t('dashboard.success_title'), description: t('dashboard.success_add_transaction') });
    } catch(e) {
        console.error("Error adding transaction: ", e);
        toast({ title: t('common.error'), description: "Could not add transaction.", variant: "destructive" });
    }
  }
  
  const handleAddSharedExpense = async () => {
    toast({
        title: t('shared_expenses.created_toast_title'),
        description: t('shared_expenses.created_toast_desc'),
    })
  };

  const handleAddSavingRoom = async (newRoom: SavingRoom) => {
    toast({
        title: t('saving_rooms.created_toast_title'),
        description: t('saving_rooms.created_toast_desc'),
    })
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Image
                  src="/favicon.svg"
                  alt="PayPlay"
                  width={32}
                  height={32}
                />
            </div>
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-4 w-40" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AddTransactionDialog 
        open={isAddTransactionOpen}
        onOpenChange={setIsAddTransactionOpen}
        onAddTransaction={handleAddTransaction}
      />
      <CreateSavingRoomDialog
        open={isCreateSavingRoomOpen}
        onOpenChange={setIsCreateSavingRoomOpen}
        onAddRoom={handleAddSavingRoom}
      />
      <div className="relative flex min-h-screen flex-col">
        <AppNavbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        
        <TooltipProvider>
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-4">
            <div
              className={cn(
                'flex flex-col items-center gap-4 transition-all duration-300 ease-in-out',
                isFabMenuOpen ? 'translate-y-0 opacity-100' : 'invisible translate-y-4 opacity-0'
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg"
                    variant="secondary"
                    onClick={() => {
                      setIsCreateSavingRoomOpen(true)
                      setIsFabMenuOpen(false)
                    }}
                  >
                    <Users className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t('saving_rooms.create_button')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg"
                    variant="secondary"
                    onClick={() => {
                      setIsAddTransactionOpen(true)
                      setIsFabMenuOpen(false)
                    }}
                  >
                    <Image
                      src="/favicon.svg"
                      alt="PayPlay"
                      width={32}
                      height={32}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t('dashboard.add_transaction_button')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <Button
              className="h-16 w-16 rounded-full shadow-lg"
              size="icon"
              onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
            >
              <PlusCircle
                className={cn(
                  'h-8 w-8 transition-transform duration-300',
                  isFabMenuOpen && 'rotate-45'
                )}
              />
              <span className="sr-only">Add new item</span>
            </Button>
          </div>
        </TooltipProvider>
        
      </div>
    </>
  )
}
