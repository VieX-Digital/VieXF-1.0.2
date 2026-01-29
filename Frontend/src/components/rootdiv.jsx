import { motion, useReducedMotion } from "framer-motion"

function RootDiv({ children, style, className = "", ...props }) {
  const shouldReduceMotion = useReducedMotion()
  const distance = 90

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: distance }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: distance }}
      transition={{ duration: 0.6, ease: [0.075, 0.82, 0.165, 1] }}
      style={{ height: "calc(100vh - 50px)", overflowY: "auto", ...style }}
      className={`no-glow ${className}`.trim()}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default RootDiv
