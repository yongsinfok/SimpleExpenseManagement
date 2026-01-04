import { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { NumberPad } from './ui/NumberPad';
import { useSecurity } from '../contexts/SecurityContext';

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
        // PIN 码长度限制为 4 位
        if (value.length > 4) return;
        setPin(value);
        setError(false);

        // 如果输入满4位，自动验证
        if (value.length === 4) {
            if (verifyPin(value)) {
                unlock();
            } else {
                setError(true);
                setShake(true);
                setTimeout(() => setShake(false), 500);
                setTimeout(() => setPin(''), 500); // 输错后清空
            }
        }
    };

    if (!isLocked) return null;

    return (
        <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={`flex flex - col items - center mb - 12 transform transition - transform duration - 100 ${shake ? 'translate-x-[-10px]' : ''} ${shake ? 'animate-pulse' : ''} `}>
                <div className={`
w - 16 h - 16 rounded - 2xl flex items - center justify - center mb - 6 shadow - lg
                    ${error ? 'bg-red-50 text-red-500' : 'bg-[var(--color-primary)] text-white'}
transition - colors duration - 300
    `}>
                    {error ? <Unlock size={32} /> : <Lock size={32} />}
                </div>

                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                    {error ? '密码错误' : '应用已锁定'}
                </h2>
                <p className="text-[var(--color-text-secondary)] text-sm">
                    {error ? '请重试' : '请输入 PIN 码解锁'}
                </p>
            </div>

            {/* PIN Dots Indicator */}
            <div className="flex gap-4 mb-12">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`
w - 4 h - 4 rounded - full border - 2 transition - all duration - 200
                            ${pin.length > i
                                ? error
                                    ? 'bg-red-500 border-red-500'
                                    : 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                : 'border-[var(--color-border)] bg-transparent'
                            }
`}
                    />
                ))}
            </div>

            <div className="w-full max-w-sm">
                <NumberPad
                    value={pin}
                    onChange={handlePinChange}
                    maxLength={4}
                    // 隐藏小数点
                    hideDecimal
                />
            </div>

            {/* 忘记密码提示 */}
            <button
                onClick={() => {
                    if (window.confirm('忘记密码？您可以重置应用数据来清除密码。是否继续？')) {
                        localStorage.clear();
                        window.location.reload();
                        toast.success('数据已重置');
                    }
                }}
                className="mt-8 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
                忘记密码？
            </button>
        </div>
    );
}
