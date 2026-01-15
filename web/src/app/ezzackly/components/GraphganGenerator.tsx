'use client';
import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PixelColor {
    r: number;
    g: number;
    b: number;
    hex: string;
    count: number;
}

export default function GraphganGenerator() {
    const [image, setImage] = useState<string | null>(null);
    const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
    const [gridSize, setGridSize] = useState(50);
    const [maxColors, setMaxColors] = useState(8);
    const [colorPalette, setColorPalette] = useState<PixelColor[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [gridData, setGridData] = useState<number[][]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            loadImage(file);
        }
    };

    const loadImage = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
            setPixelatedImage(null);
            setColorPalette([]);
            setGridData([]);
        };
        reader.readAsDataURL(file);
    };

    // Color quantization using median cut algorithm (simplified)
    const quantizeColors = (imageData: ImageData, numColors: number): PixelColor[] => {
        const pixels: [number, number, number][] = [];

        for (let i = 0; i < imageData.data.length; i += 4) {
            pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
        }

        // Simple k-means-like clustering
        const buckets: Map<string, { r: number; g: number; b: number; count: number }> = new Map();
        const step = Math.ceil(256 / Math.cbrt(numColors));

        pixels.forEach(([r, g, b]) => {
            const qr = Math.floor(r / step) * step;
            const qg = Math.floor(g / step) * step;
            const qb = Math.floor(b / step) * step;
            const key = `${qr},${qg},${qb}`;

            const existing = buckets.get(key);
            if (existing) {
                existing.r = Math.round((existing.r * existing.count + r) / (existing.count + 1));
                existing.g = Math.round((existing.g * existing.count + g) / (existing.count + 1));
                existing.b = Math.round((existing.b * existing.count + b) / (existing.count + 1));
                existing.count++;
            } else {
                buckets.set(key, { r, g, b, count: 1 });
            }
        });

        // Sort by count and take top N
        const sorted = Array.from(buckets.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, numColors);

        return sorted.map((c) => ({
            ...c,
            hex: `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`,
        }));
    };

    const findClosestColor = (r: number, g: number, b: number, palette: PixelColor[]): number => {
        let minDist = Infinity;
        let closestIdx = 0;

        palette.forEach((color, idx) => {
            const dist = Math.sqrt(
                Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                closestIdx = idx;
            }
        });

        return closestIdx;
    };

    const processImage = () => {
        if (!image || !canvasRef.current) return;

        setIsProcessing(true);

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d')!;

            // Set canvas to grid size
            canvas.width = gridSize;
            canvas.height = gridSize;

            // Draw scaled image
            ctx.drawImage(img, 0, 0, gridSize, gridSize);

            // Get pixel data
            const imageData = ctx.getImageData(0, 0, gridSize, gridSize);

            // Quantize colors
            const palette = quantizeColors(imageData, maxColors);
            setColorPalette(palette);

            // Map each pixel to closest palette color and build grid
            const grid: number[][] = [];
            const newData = new Uint8ClampedArray(imageData.data.length);

            for (let y = 0; y < gridSize; y++) {
                const row: number[] = [];
                for (let x = 0; x < gridSize; x++) {
                    const i = (y * gridSize + x) * 4;
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];

                    const colorIdx = findClosestColor(r, g, b, palette);
                    row.push(colorIdx);

                    newData[i] = palette[colorIdx].r;
                    newData[i + 1] = palette[colorIdx].g;
                    newData[i + 2] = palette[colorIdx].b;
                    newData[i + 3] = 255;
                }
                grid.push(row);
            }

            setGridData(grid);

            // Put quantized image back
            ctx.putImageData(new ImageData(newData, gridSize, gridSize), 0, 0);

            // Scale up for display
            const displayCanvas = document.createElement('canvas');
            const displaySize = 400;
            displayCanvas.width = displaySize;
            displayCanvas.height = displaySize;
            const displayCtx = displayCanvas.getContext('2d')!;
            displayCtx.imageSmoothingEnabled = false;
            displayCtx.drawImage(canvas, 0, 0, displaySize, displaySize);

            // Draw grid lines
            displayCtx.strokeStyle = 'rgba(0,0,0,0.1)';
            displayCtx.lineWidth = 0.5;
            const cellSize = displaySize / gridSize;
            for (let i = 0; i <= gridSize; i++) {
                displayCtx.beginPath();
                displayCtx.moveTo(i * cellSize, 0);
                displayCtx.lineTo(i * cellSize, displaySize);
                displayCtx.stroke();
                displayCtx.beginPath();
                displayCtx.moveTo(0, i * cellSize);
                displayCtx.lineTo(displaySize, i * cellSize);
                displayCtx.stroke();
            }

            setPixelatedImage(displayCanvas.toDataURL());
            setIsProcessing(false);
        };
        img.src = image;
    };

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-[#D4A5A5]/10 border border-[#E8D5D5]/50 overflow-hidden">
            <div className="p-6 border-b border-[#E8D5D5]/50 bg-gradient-to-r from-[#F7E7CE]/30 to-transparent">
                <h2
                    className="text-2xl font-bold text-[#3C2415]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    Graphgan Generator
                </h2>
                <p className="text-[#3C2415]/50 mt-1 text-sm">Convert images to pixel charts for C2C crochet</p>
            </div>

            <div className="p-6 space-y-6">
                {/* Upload Area */}
                {!image ? (
                    <motion.div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        whileHover={{ scale: 1.01 }}
                        className="border-2 border-dashed border-[#D4A5A5]/50 rounded-2xl p-12 text-center cursor-pointer hover:border-[#D4A5A5] hover:bg-[#F7E7CE]/20 transition-all"
                    >
                        <div className="text-4xl mb-4">🖼️</div>
                        <p className="text-[#3C2415] font-medium">Drop an image here</p>
                        <p className="text-[#3C2415]/50 text-sm mt-1">or click to browse</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </motion.div>
                ) : (
                    <>
                        {/* Image Preview and Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Original Image */}
                            <div>
                                <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                                    Original
                                </label>
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F7E7CE]/30 border border-[#E8D5D5]">
                                    <img src={image} alt="Original" className="w-full h-full object-contain" />
                                </div>
                                <button
                                    onClick={() => {
                                        setImage(null);
                                        setPixelatedImage(null);
                                        setColorPalette([]);
                                        setGridData([]);
                                    }}
                                    className="mt-2 text-sm text-[#D4A5A5] hover:underline"
                                >
                                    Choose different image
                                </button>
                            </div>

                            {/* Pixelated Result */}
                            <div>
                                <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                                    {gridSize}×{gridSize} Grid
                                </label>
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F7E7CE]/30 border border-[#E8D5D5] flex items-center justify-center">
                                    {pixelatedImage ? (
                                        <img src={pixelatedImage} alt="Pixelated" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                                    ) : (
                                        <span className="text-[#3C2415]/30">Click Generate</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#3C2415]/70 mb-2">
                                    Grid Size: {gridSize}×{gridSize}
                                </label>
                                <input
                                    type="range"
                                    min="25"
                                    max="100"
                                    step="25"
                                    value={gridSize}
                                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                                    className="w-full accent-[#D4A5A5]"
                                />
                                <div className="flex justify-between text-xs text-[#3C2415]/40 mt-1">
                                    <span>25</span>
                                    <span>50</span>
                                    <span>75</span>
                                    <span>100</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#3C2415]/70 mb-2">
                                    Max Colors: {maxColors}
                                </label>
                                <input
                                    type="range"
                                    min="4"
                                    max="16"
                                    step="2"
                                    value={maxColors}
                                    onChange={(e) => setMaxColors(parseInt(e.target.value))}
                                    className="w-full accent-[#D4A5A5]"
                                />
                                <div className="flex justify-between text-xs text-[#3C2415]/40 mt-1">
                                    <span>4</span>
                                    <span>8</span>
                                    <span>12</span>
                                    <span>16</span>
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <motion.button
                            onClick={processImage}
                            disabled={isProcessing}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4A5A5] to-[#C5A065] text-white font-bold text-lg shadow-lg shadow-[#D4A5A5]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : '✨ Generate Chart'}
                        </motion.button>

                        {/* Color Palette */}
                        {colorPalette.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-[#3C2415]/70 mb-3 uppercase tracking-wider">
                                    Color Legend ({colorPalette.length} colors)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {colorPalette.map((color, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex items-center gap-2 p-2 rounded-lg bg-[#F7E7CE]/30 border border-[#E8D5D5]/30"
                                        >
                                            <div
                                                className="w-8 h-8 rounded-lg shadow-inner flex items-center justify-center text-xs font-bold"
                                                style={{ backgroundColor: color.hex, color: (color.r + color.g + color.b) / 3 > 128 ? '#3C2415' : '#fff' }}
                                            >
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-mono text-[#3C2415]">{color.hex.toUpperCase()}</div>
                                                <div className="text-xs text-[#3C2415]/40">{color.count} stitches</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Hidden canvas for processing */}
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
}
