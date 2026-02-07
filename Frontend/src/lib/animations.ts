import { Variants } from "framer-motion"

export const pageContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
            when: "beforeChildren"
        }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2 }
    }
}

export const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { 
            type: "spring",
            stiffness: 300,
            damping: 24
        }
    }
}

export const cardHoverVariants: Variants = {
    initial: { scale: 1, y: 0 },
    hover: { 
        scale: 1.02, 
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 10 }
    },
    tap: { scale: 0.98 }
}
