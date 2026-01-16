'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PixelColor {
    r: number;
    g: number;
    b: number;
    hex: string;
    count: number;
}

interface CropState {
    zoom: number;
    panX: number;
    panY: number;
}

const PRESETS = [
    { name: 'Square', width: 50, height: 50 },
    { name: 'Scarf', width: 30, height: 100 },
    { name: 'Blanket', width: 80, height: 100 },
    { name: 'Pillow', width: 50, height: 50 },
    { name: 'Custom', width: 0, height: 0 },
];

export default function GraphganGenerator() {
    const [image, setImage] = useState<string | null>(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
    const [gridWidth, setGridWidth] = useState(50);
    const [gridHeight, setGridHeight] = useState(50);
    const [maxColors, setMaxColors] = useState(8);
    const [colorPalette, setColorPalette] = useState<PixelColor[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('Square');
    const [crop, setCrop] = useState<CropState>({ zoom: 1, panX: 0.5, panY: 0.5 });
    const [isDragging, setIsDragging] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cropperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle preset selection
    useEffect(() => {
        const preset = PRESETS.find(p => p.name === selectedPreset);
        if (preset && preset.width > 0) {
            setGridWidth(preset.width);
            setGridHeight(preset.height);
        }
    }, [selectedPreset]);

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
            const imgSrc = e.target?.result as string;
            setImage(imgSrc);
            setPixelatedImage(null);
            setColorPalette([]);
            setCrop({ zoom: 1, panX: 0.5, panY: 0.5 });

            // Get image dimensions
            const img = new Image();
            img.onload = () => {
                setImageSize({ width: img.width, height: img.height });
            };
            img.src = imgSrc;
        };
        reader.readAsDataURL(file);
    };

    // Handle mouse drag for panning
    const handleMouseDown = () => setIsDragging(true);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !cropperRef.current) return;

        const rect = cropperRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setCrop(prev => ({
            ...prev,
            panX: Math.max(0, Math.min(1, x)),
            panY: Math.max(0, Math.min(1, y)),
        }));
    };

    // Touch support for mobile
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!cropperRef.current) return;
        const touch = e.touches[0];
        const rect = cropperRef.current.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / rect.width;
        const y = (touch.clientY - rect.top) / rect.height;

        setCrop(prev => ({
            ...prev,
            panX: Math.max(0, Math.min(1, x)),
            panY: Math.max(0, Math.min(1, y)),
        }));
    };

    const quantizeColors = (imageData: ImageData, numColors: number): PixelColor[] => {
        const pixels: [number, number, number][] = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
            pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
        }

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

            // Calculate crop area based on zoom and pan
            const aspectRatio = gridWidth / gridHeight;
            const imgAspect = img.width / img.height;

            let sourceWidth: number, sourceHeight: number;
            if (imgAspect > aspectRatio) {
                // Image is wider than target
                sourceHeight = img.height / crop.zoom;
                sourceWidth = sourceHeight * aspectRatio;
            } else {
                // Image is taller than target
                sourceWidth = img.width / crop.zoom;
                sourceHeight = sourceWidth / aspectRatio;
            }

            // Calculate source position based on pan
            const maxPanX = img.width - sourceWidth;
            const maxPanY = img.height - sourceHeight;
            const sourceX = maxPanX * crop.panX;
            const sourceY = maxPanY * crop.panY;

            // Set canvas to grid size
            canvas.width = gridWidth;
            canvas.height = gridHeight;

            // Draw cropped and scaled image
            ctx.drawImage(
                img,
                sourceX, sourceY, sourceWidth, sourceHeight,
                0, 0, gridWidth, gridHeight
            );

            // Get pixel data
            const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight);
            const palette = quantizeColors(imageData, maxColors);
            setColorPalette(palette);

            // Map each pixel to closest palette color
            const newData = new Uint8ClampedArray(imageData.data.length);
            for (let y = 0; y < gridHeight; y++) {
                for (let x = 0; x < gridWidth; x++) {
                    const i = (y * gridWidth + x) * 4;
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    const colorIdx = findClosestColor(r, g, b, palette);
                    newData[i] = palette[colorIdx].r;
                    newData[i + 1] = palette[colorIdx].g;
                    newData[i + 2] = palette[colorIdx].b;
                    newData[i + 3] = 255;
                }
            }

            ctx.putImageData(new ImageData(newData, gridWidth, gridHeight), 0, 0);

            // Scale up for display with grid lines
            const displayCanvas = document.createElement('canvas');
            const maxDisplaySize = 400;
            const scale = Math.min(maxDisplaySize / gridWidth, maxDisplaySize / gridHeight);
            const displayWidth = Math.round(gridWidth * scale);
            const displayHeight = Math.round(gridHeight * scale);

            displayCanvas.width = displayWidth;
            displayCanvas.height = displayHeight;
            const displayCtx = displayCanvas.getContext('2d')!;
            displayCtx.imageSmoothingEnabled = false;
            displayCtx.drawImage(canvas, 0, 0, displayWidth, displayHeight);

            // Draw grid lines
            displayCtx.strokeStyle = 'rgba(0,0,0,0.1)';
            displayCtx.lineWidth = 0.5;
            const cellW = displayWidth / gridWidth;
            const cellH = displayHeight / gridHeight;
            for (let i = 0; i <= gridWidth; i++) {
                displayCtx.beginPath();
                displayCtx.moveTo(i * cellW, 0);
                displayCtx.lineTo(i * cellW, displayHeight);
                displayCtx.stroke();
            }
            for (let i = 0; i <= gridHeight; i++) {
                displayCtx.beginPath();
                displayCtx.moveTo(0, i * cellH);
                displayCtx.lineTo(displayWidth, i * cellH);
                displayCtx.stroke();
            }

            setPixelatedImage(displayCanvas.toDataURL());
            setIsProcessing(false);
        };
        img.src = image;
    };

    // Calculate crop preview styles
    const getCropPreviewStyle = () => {
        if (!imageSize.width) return {};
        const aspectRatio = gridWidth / gridHeight;
        const imgAspect = imageSize.width / imageSize.height;

        let w: number, h: number;
        if (imgAspect > aspectRatio) {
            h = 100 / crop.zoom;
            w = h * aspectRatio / imgAspect;
        } else {
            w = 100 / crop.zoom;
            h = w * imgAspect / aspectRatio;
        }

        const maxLeft = 100 - w;
        const maxTop = 100 - h;

        return {
            width: `${w}%`,
            height: `${h}%`,
            left: `${maxLeft * crop.panX}%`,
            top: `${maxTop * crop.panY}%`,
        };
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
                        {/* Cropper Area */}
                        <div>
                            <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                                Position &amp; Crop — drag to move, zoom to resize
                            </label>
                            <div
                                ref={cropperRef}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                onTouchMove={handleTouchMove}
                                className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#F7E7CE]/30 border border-[#E8D5D5] cursor-move select-none"
                            >
                                <img
                                    src={image}
                                    alt="Source"
                                    className="w-full h-full object-contain pointer-events-none"
                                    draggable={false}
                                />
                                {/* Crop viewport overlay */}
                                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                                <div
                                    className="absolute border-2 border-white shadow-lg pointer-events-none"
                                    style={getCropPreviewStyle()}
                                >
                                    <div className="absolute inset-0 bg-transparent" />
                                    <img
                                        src={image}
                                        alt="Crop preview"
                                        className="absolute object-contain opacity-100"
                                        style={{
                                            width: `${100 * crop.zoom}%`,
                                            height: `${100 * crop.zoom}%`,
                                            left: `-${(parseFloat(getCropPreviewStyle().left as string) || 0) * crop.zoom}%`,
                                            top: `-${(parseFloat(getCropPreviewStyle().top as string) || 0) * crop.zoom}%`,
                                        }}
                                        draggable={false}
                                    />
                                </div>
                                {/* Dimension indicator */}
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                    {gridWidth}×{gridHeight}
                                </div>
                            </div>

                            {/* Zoom slider */}
                            <div className="mt-3">
                                <label className="block text-sm font-medium text-[#3C2415]/70 mb-1">
                                    Zoom: {Math.round(crop.zoom * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="4"
                                    step="0.1"
                                    value={crop.zoom}
                                    onChange={(e) => setCrop(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                                    className="w-full accent-[#D4A5A5]"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    setImage(null);
                                    setPixelatedImage(null);
                                    setColorPalette([]);
                                }}
                                className="mt-2 text-sm text-[#D4A5A5] hover:underline"
                            >
                                Choose different image
                            </button>
                        </div>

                        {/* Preset & Dimensions */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                                    Preset
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => setSelectedPreset(preset.name)}
                                            className={`px-4 py-2 rounded-xl text-sm transition-all ${selectedPreset === preset.name
                                                    ? 'bg-gradient-to-r from-[#D4A5A5] to-[#C5A065] text-white shadow-md'
                                                    : 'bg-[#F7E7CE]/50 text-[#3C2415] hover:bg-[#D4A5A5]/20'
                                                }`}
                                        >
                                            {preset.name}
                                            {preset.width > 0 && (
                                                <span className="ml-1 opacity-70">({preset.width}×{preset.height})</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Width & Height sliders */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#3C2415]/70 mb-2">
                                        Width: {gridWidth} stitches
                                    </label>
                                    <input
                                        type="range"
                                        min="20"
                                        max="150"
                                        step="5"
                                        value={gridWidth}
                                        onChange={(e) => {
                                            setGridWidth(parseInt(e.target.value));
                                            setSelectedPreset('Custom');
                                        }}
                                        className="w-full accent-[#D4A5A5]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#3C2415]/70 mb-2">
                                        Height: {gridHeight} rows
                                    </label>
                                    <input
                                        type="range"
                                        min="20"
                                        max="150"
                                        step="5"
                                        value={gridHeight}
                                        onChange={(e) => {
                                            setGridHeight(parseInt(e.target.value));
                                            setSelectedPreset('Custom');
                                        }}
                                        className="w-full accent-[#D4A5A5]"
                                    />
                                </div>
                            </div>

                            {/* Max Colors */}
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

                        {/* Result */}
                        {pixelatedImage && (
                            <div>
                                <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                                    {gridWidth}×{gridHeight} Grid Result
                                </label>
                                <div className="rounded-xl overflow-hidden bg-[#F7E7CE]/30 border border-[#E8D5D5] flex items-center justify-center p-4">
                                    <img
                                        src={pixelatedImage}
                                        alt="Pixelated"
                                        className="max-w-full max-h-[400px]"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>
                            </div>
                        )}

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

                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
}
