'use client';

import { useState, useEffect, useRef } from 'react';

interface AutoScrollControlProps {
    targetId?: string;
}

export default function AutoScrollControl({ targetId }: AutoScrollControlProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    // Load speed from localStorage, default to 0.5 (slower initial speed)
    const [speed, setSpeed] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('autoscroll-speed');
            return saved ? parseFloat(saved) : 0.5;
        }
        return 0.5;
    });
    const scrollInterval = useRef<NodeJS.Timeout | null>(null);
    const startDelayTimeout = useRef<NodeJS.Timeout | null>(null);

    // Save speed to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('autoscroll-speed', speed.toString());
        }
    }, [speed]);

    useEffect(() => {
        if (isPlaying && !isStarting) {
            scrollInterval.current = setInterval(() => {
                let element: HTMLElement | Window = window;
                let currentScroll = window.scrollY;
                let maxScroll = document.body.offsetHeight - window.innerHeight;

                if (targetId) {
                    const el = document.getElementById(targetId);
                    if (el) {
                        element = el;
                        currentScroll = el.scrollTop;
                        maxScroll = el.scrollHeight - el.clientHeight;
                    }
                }

                // Check if we reached the bottom
                if (currentScroll >= maxScroll) {
                    setIsPlaying(false);
                    setIsStarting(false);
                    if (scrollInterval.current) clearInterval(scrollInterval.current);
                    return;
                }

                element.scrollBy({
                    top: 1,
                    behavior: 'auto'
                });
            }, 50 / speed); // Adjust interval based on speed
        } else {
            if (scrollInterval.current) {
                clearInterval(scrollInterval.current);
            }
        }

        return () => {
            if (scrollInterval.current) {
                clearInterval(scrollInterval.current);
            }
            if (startDelayTimeout.current) {
                clearTimeout(startDelayTimeout.current);
            }
        };
    }, [isPlaying, isStarting, speed, targetId]);

    const handlePlayClick = () => {
        if (isPlaying) {
            // Stop immediately
            setIsPlaying(false);
            setIsStarting(false);
            if (startDelayTimeout.current) {
                clearTimeout(startDelayTimeout.current);
            }
        } else {
            // Start with delay
            setIsStarting(true);
            startDelayTimeout.current = setTimeout(() => {
                setIsStarting(false);
                setIsPlaying(true);
            }, 2000); // 2 second delay before scrolling starts
        }
    };

    return (
        <div className="fixed bottom-6 right-6 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-4 z-50">
            <button
                onClick={handlePlayClick}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isPlaying || isStarting
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
            >
                {isStarting ? (
                    <span className="text-xs">⏱</span>
                ) : isPlaying ? (
                    <span className="text-xl">⏸</span>
                ) : (
                    <span className="text-xl pl-1">▶</span>
                )}
            </button>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">
                    {isStarting ? 'Starting...' : 'Scroll Speed'}
                </label>
                <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    disabled={isStarting}
                />
            </div>
        </div>
    );
}
