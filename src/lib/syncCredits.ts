import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';


export interface SyncCreditsBalance {
  free: number; // Always returns 1 to indicate free sync availability (subject to per-account cooldown)
  extra: number;
}

/**
 * Retorna a quantidade de créditos extras disponíveis. 
 * A sincronização "free" agora é baseada em 24h por conta, então 'free' sempre retorna 1 
 * para facilitar a lógica de UI de "tem crédito disponível".
 */
export async function getSyncCredits(userId: string): Promise<SyncCreditsBalance> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return { free: 1, extra: 0 };
  
  const data = userSnap.data();
  const currentExtra = typeof data.extraSyncCredits === 'number' ? data.extraSyncCredits : 0;
  
  return { 
    free: 1, // Indica que sempre há potencial de sincronização gratuita (dependendo da última atualização da conta)
    extra: currentExtra
  };
}

/**
 * Consome apenas créditos extras via frontend (opcional, o backend já faz isso).
 */
export async function consumeSyncCredit(userId: string, isExtra: boolean = false): Promise<boolean> {
  if (!isExtra) return true; // Sincronização normal não consome crédito global
  
  const balance = await getSyncCredits(userId);
  if (balance.extra <= 0) return false;
  
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    extraSyncCredits: balance.extra - 1
  });
  
  return true;
}
