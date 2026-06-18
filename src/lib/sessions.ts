import { db } from './firebase';
import { doc, setDoc, collection, deleteDoc, onSnapshot, serverTimestamp, Timestamp, increment } from 'firebase/firestore';

export interface UserSession {
    id: string;
    ip: string;
    userAgent: string;
    deviceName: string;
    deviceType: 'pc' | 'mobile';
    lastSeen: Timestamp;
    isCurrent: boolean;
}

const DEVICE_ID_KEY = 'controlar_device_id';

export function getDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

export async function trackSession(uid: string) {
    const deviceId = getDeviceId();
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const signupPlatform = getDevicePlatform(ua);

    let ip = 'IP Protegido';
    try {
        // Usando um serviço rápido e leve para pegar o IP
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ip = data.ip;
    } catch (e) {
        console.warn('Não foi possível obter o IP');
    }

    const sessionData = {
        id: deviceId,
        ip,
        userAgent: ua,
        deviceType: isMobile ? 'mobile' : 'pc',
        deviceName: getDeviceName(ua),
        signupPlatform,
        lastSeen: serverTimestamp(),
    };

    await setDoc(doc(db, `users/${uid}/sessions`, deviceId), sessionData, { merge: true });

    // Track activity: lastLogin always updated, activeDaysCount incremented once per calendar day
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const lastActivityKey = `controlar_last_activity_${uid}`;
    const lastActivityDate = localStorage.getItem(lastActivityKey);

    const userActivityData: Record<string, any> = {
        lastLogin: serverTimestamp(),
        lastDevice: {
            deviceName: sessionData.deviceName,
            deviceType: sessionData.deviceType,
            signupPlatform: sessionData.signupPlatform,
            userAgent: sessionData.userAgent,
            capturedAt: serverTimestamp(),
        },
    };

    if (lastActivityDate !== today) {
        localStorage.setItem(lastActivityKey, today);
        userActivityData.activeDaysCount = increment(1);
    }

    await setDoc(doc(db, 'users', uid), userActivityData, { merge: true });
}

function getDevicePlatform(ua: string): 'android' | 'iphone' | 'mobile' | 'desktop' {
    if (ua.includes('Android')) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iphone';
    if (/webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Mobi/i.test(ua)) return 'mobile';
    return 'desktop';
}

function getDeviceName(ua: string): string {
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Dispositivo Android';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Macbook/Mac';
    if (ua.includes('Linux')) return 'Linux PC';
    return 'Dispositivo';
}

export function subscribeToSessions(uid: string, callback: (sessions: UserSession[]) => void) {
    const currentDeviceId = getDeviceId();
    return onSnapshot(collection(db, `users/${uid}/sessions`), (snapshot) => {
        const sessions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                isCurrent: doc.id === currentDeviceId
            } as UserSession;
        });

        // Simplificação: Se houver várias sessões com o mesmo IP e mesmo DeviceName, 
        // consideramos como duplicatas e mostramos apenas a mais recente se for o caso.
        // Mas usando DeviceId persistente no localStorage, isso já reduz drasticamente a duplicação indesejada.

        // Sort: Current first, then by lastSeen desc
        sessions.sort((a, b) => {
            if (a.isCurrent) return -1;
            if (b.isCurrent) return 1;
            const timeA = a.lastSeen?.toMillis() || 0;
            const timeB = b.lastSeen?.toMillis() || 0;
            return timeB - timeA;
        });

        callback(sessions);
    });
}

export async function revokeSession(uid: string, sessionId: string) {
    await deleteDoc(doc(db, `users/${uid}/sessions`, sessionId));
}
