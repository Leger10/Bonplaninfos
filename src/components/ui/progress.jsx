import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <motion.div
      className="h-full w-full flex-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"
      style={{ scaleX: (value || 0) / 100, originX: 0 }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: (value || 0) / 100 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }