import { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { NumberPad, PinDots } from './ui';
import { useSecurity } from '../contexts/SecurityContext';

const PIN_LENGTH = 4;
const SHAKE_DURATION = 500;
const CLEAR_DELAY = 500;

export function LockScreen() {
    const { isLocked, verifyPin, unlock } = useSecurity();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (!isLocked) {
            setPin('');
            setError(false);
        }
    }, [isLocked]);

    const handlePinChange = (value: string) => {
        if (value.length > PIN_LENGTH) return;
        setPin(value);
        setError(false);

        if (value.length === PIN_LENGTH) {
            if (verifyPin(value)) {
                unlock();
            } else {
                setError(true);
                setShake(true);
                setTimeout(() => setShake(false), SHAKE_DURATION);
                setTimeout(() => setPin(''), CLEAR_DELAY);
            }
        }
    };

    if (!isLocked) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-[var(--color-bg)]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className={`flex flex-col items-center mb-10 transition-transform duration-100 ${shake ? 'translate-x-[-10px] animate-pulse' : ''}`}>
                <div className={`
                    w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-[var(--color-primary)]/20
                    ${error ? 'bg-red-50 text-red-500' : 'bg-[var(--color-primary)] text-white'}
                    transition-all duration-300
                `}>
                    {error ? <Unlock size={36} strokeWidth={2.5} /> : <Lock size={36} strokeWidth={2.5} />}
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-[var(--color-text)] tracking-tight">
                        {error ? '密码错误' : '应用已锁定'}
                    </h2>
                    <p className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-widest opacity-60">
                        {error ? '请重新输入正确密码' : '请输入 PIN 码解锁'}
                    </p>
                </div>
            </div>

            <PinDots length={PIN_LENGTH} filled={pin.length} className="mb-12" error={error} />

            <div className="w-full max-w-[320px]">
                <NumberPad
                    value={pin}
                    onChange={handlePinChange}
                    maxLength={PIN_LENGTH}
                    hideDecimal
                />
            </div>

            <button
                onClick={() => {
                    if (window.confirm('忘记密码？您可以重置应用数据来清除密码。此操作将删除所有本地记账数据。是否继续？')) {
                        localStorage.clear();
                        window.location.reload();
                        toast.success('数据已重置');
                    }
                }}
                className="mt-12 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors opacity-50 hover:opacity-100"
            >
                忘记密码？
            </button>
        </div>
    );
}
