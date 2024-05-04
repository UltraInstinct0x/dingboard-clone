'use client';

import { useRef } from "react";

export default function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    function handleOnDrop(e: DragEvent<HTMLCanvasElement>) {
        e.preventDefault();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        for (const file of e.dataTransfer.files) {
            const reader = new FileReader();
            reader.onload = (eventReader) => {
                const img = new Image();
                img.onload = () => {
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left + window.scrollX - img.width / 2;
                    const y = e.clientY - rect.top + window.scrollY - img.height / 2;
                    ctx.drawImage(img, x, y, img.width, img.height); // Draw the image with its original size
                };
                img.src = eventReader.target.result;
            };

            reader.readAsDataURL(file);
        }
    }
    return (
        <main>
            <canvas
                id="canvas"
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                className="border-solid bg-gray-700 border-white border-4 h-screen w-screen"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleOnDrop}
            ></canvas>
        </main>
    );
}
