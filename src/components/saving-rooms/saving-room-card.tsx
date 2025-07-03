
import Link from 'next/link';
import Image from 'next/image';
import type { SavingRoom } from '@/lib/types';
import { useI18n } from '@/context/i18n-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface SavingRoomCardProps {
  room: SavingRoom;
}

export const SavingRoomCard: React.FC<SavingRoomCardProps> = ({ room }) => {
    const { t, locale } = useI18n();
    const paidAmount = room.payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const progress = room.totalAmount > 0 ? (paidAmount / room.totalAmount) * 100 : 0;
    const currentLocale = locale === 'es' ? 'es-ES' : 'en-US';

    return (
        <Link href={`/saving-rooms/${room.id}`} className="flex">
            <Card className="flex w-full flex-col shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="font-headline">{room.name}</CardTitle>
                    {room.goal && <CardDescription>{room.goal}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-grow">
                    <div className="mb-4">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm text-muted-foreground">{t('saving_rooms.progress')}</span>
                            <span className="font-semibold text-lg">${paidAmount.toLocaleString(currentLocale)} / <span className="text-muted-foreground">${room.totalAmount.toLocaleString(currentLocale)}</span></span>
                        </div>
                        <Progress value={progress} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">{t('saving_rooms.participants')}</h4>
                        <TooltipProvider>
                            <div className="flex items-center -space-x-2">
                                {room.participants.map(p => (
                                    <Tooltip key={p.id}>
                                        <TooltipTrigger asChild>
                                            <Avatar className="border-2 border-background">
                                                <Image src={p.avatarUrl} alt={p.name} width={40} height={40} data-ai-hint="person" />
                                                <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{p.name}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </TooltipProvider>
                    </div>
                </CardContent>
                <CardFooter>
                    {
                        progress >= 100
                            ? <Badge className='bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30 dark:text-green-400'>{t('saving_rooms.status_completed')}</Badge>
                            : <Badge variant="secondary">{t('saving_rooms.status_in_progress')}</Badge>
                    }
                </CardFooter>
            </Card>
        </Link>
    );
};
