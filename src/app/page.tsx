'use client';

import { useRef } from "react";

interface ImageWithZIndex {
    image: HTMLImageElement;
    zIndex: number;
    x: number;
    y: number;
}

export default function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const images = useRef<ImageWithZIndex[]>([]);
    const selectedImage = useRef<ImageWithZIndex | null>(null);
    const isDragging = useRef<boolean>(false);
    const dragStart = useRef<{ x: number, y: number } | null>(null);
        
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
                    images.current.push({ image: img, zIndex: images.current.length, x, y });
                };
                img.src = eventReader.target.result;
            };

            reader.readAsDataURL(file);
        }
    }

    function selectImage(images: ImageWithZIndex[], x: number, y: number) {
        let selected = false;
        let temp = null;
        for (let i = images.length - 1; i >= 0; i--) {
            const image = images[i];
            if (x >= image.x && x <= image.x + image.image.width && y >= image.y && y <= image.y + image.image.height) {
                if (temp != null && temp.zIndex > image.zIndex) {
                    continue;
                }
                temp = image;
                selected = true;
            }
        }
        if (!selected) {
            selectedImage.current = null;
        } else {
            selectedImage.current = temp;
        }
    }

    function handleOnMouseDown(e: MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        //find the image that was clicked on
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + window.scrollX;
        const y = e.clientY - rect.top + window.scrollY;
        dragStart.current = { x, y };
        selectImage(images.current, x, y);
        drawImages();
        isDragging.current = selectedImage.current != null;
    }

    function handleOnMouseUp(e: MouseEvent<HTMLCanvasElement>) {
        isDragging.current = false;
        dragStart.current = null;
    }

    function handleonMouseMove(e: MouseEvent<HTMLCanvasElement>) {
        if (isDragging.current && selectedImage.current != null) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + window.scrollX;
            const y = e.clientY - rect.top + window.scrollY;

            const deltaX = x - dragStart.current.x;
            const deltaY = y - dragStart.current.y;
            dragStart.current = { x, y };

            selectedImage.current.x += deltaX;
            selectedImage.current.y += deltaY;

            drawImages();
        }
    }

    function drawImages() {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        //clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const image of images.current) {
            if (selectedImage.current != null && selectedImage.current.image === image.image) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.strokeRect(image.x, image.y, image.image.width, image.image.height);
                ctx.drawImage(selectedImage.current.image, selectedImage.current.x, selectedImage.current.y, selectedImage.current.image.width, selectedImage.current.image.height);
                continue;
            }
            ctx.drawImage(image.image, image.x, image.y, image.image.width, image.image.height);
        }
    }


    return (
        <main>
            <canvas
                id="canvas"
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                className="bg-gray-700"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleOnDrop}
                onMouseDown={handleOnMouseDown}
                onMouseUp={handleOnMouseUp}
                onMouseMove={handleonMouseMove}
            ></canvas>
        </main>
    );
}
