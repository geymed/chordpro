'use client';

import { useState, useEffect, useRef } from 'react';

export default function AutoScrollControl() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1); // 1-10
    const scrollInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isPlaying) {
            scrollInterval.current = setInterval(() => {
                // Check if we reached the bottom
                if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
                    setIsPlaying(false);
                    if (scrollInterval.current) clearInterval(scrollInterval.current);
                    return;
                }

                window.scrollBy({
                    top: 1,
                    behavior: 'auto' // 'smooth' can be jerky with frequent updates
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
        };
    }, [isPlaying, speed]);

    return (
        <div className="fixed bottom-6 right-6 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 flex items-center gap-4 z-50">
            <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isPlaying
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
            >
                {isPlaying ? (
                    <span className="text-xl">⏸</span>
                ) : (
                    <span className="text-xl pl-1">▶</span>
                )}
            </button>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Scroll Speed</label>
                <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
            </div>
        </div>
    );
}
