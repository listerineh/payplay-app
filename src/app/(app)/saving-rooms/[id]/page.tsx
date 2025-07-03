
import { SavingRoomDetails } from '@/components/saving-room-details';
import type { SavingRoom } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import { type Metadata } from 'next';

async function getRoom(id: string): Promise<SavingRoom | null> {
  const roomDocRef = doc(db, 'saving-rooms', id);
  const roomDocSnap = await getDoc(roomDocRef);

  if (!roomDocSnap.exists()) {
    return null;
  }
  
  const roomData = { id: roomDocSnap.id, ...roomDocSnap.data() } as SavingRoom;
  
  // Ensure optional array fields exist
  if (!roomData.discussion) roomData.discussion = [];
  
  return roomData;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const room = await getRoom(params.id);
  
  if (!room) {
    return {
      title: 'Room not found',
    };
  }

  return {
    title: `${room.name} | PayPlan`,
    description: room.goal || `Details for saving room: ${room.name}`,
  };
}

export default async function SavingRoomPage({ params }: { params: { id: string } }) {
  const room = await getRoom(params.id);

  if (!room) {
    notFound();
  }
  
  return <SavingRoomDetails initialRoom={room} />;
}
