import { useCountUp } from '@/hooks/useMotion'

/** A figure that rolls up to its value. Integers stay integers while moving. */
export function CountUp(
  { value, format = String, duration }:
  { value: number; format?: (n: number) => string; duration?: number },
) {
  const v = useCountUp(value, duration)
  const n = Number.isInteger(value) ? Math.round(v) : Math.round(v * 100) / 100
  return <>{format(n)}</>
}
