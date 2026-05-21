import { useIsMobile } from '@/hooks/use-mobile';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

/** Resolves to `/planets` (hub picks ring vs solar system by viewport). */
export function useStudentHubPath(): string {
  useIsMobile(); // subscribe to resize so hub re-renders when crossing breakpoint
  return STUDENT_HUB_PATH;
}
