"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

/**
 * A container with a spotlight effect from Magic UI
 */
export function MagicCard({
    children,
    className,
    gradientSize = 200,
    gradientColor = "rgba(255, 153, 51, 0.15)",
    gradientOpacity = 0.8,
    ...props
}) {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(-gradientSize);
    const mouseY = useMotionValue(-gradientSize);

    const handleMouseMove = useCallback(
        (e) => {
            if (cardRef.current) {
                const { left, top } = cardRef.current.getBoundingClientRect();
                mouseX.set(e.clientX - left);
                mouseY.set(e.clientY - top);
            }
        },
        [mouseX, mouseY],
    );

    const handleMouseOut = useCallback(() => {
        mouseX.set(-gradientSize);
        mouseY.set(-gradientSize);
    }, [mouseX, mouseY, gradientSize]);

    useEffect(() => {
        handleMouseOut();
    }, [handleMouseOut]);

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseOut={handleMouseOut}
            onMouseLeave={handleMouseOut}
            className={cn(
                "group relative flex size-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-white",
                className,
            )}
            {...props}
        >
            <div className="relative z-10 w-full h-full">{children}</div>
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
          `,
                    opacity: gradientOpacity,
                }}
            />
        </div>
    );
}
