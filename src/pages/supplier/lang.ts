import { useProfile } from "@/hooks/useProfile";

/** Bilingual text helper for the supplier portal (EN / 中文) */
export function useSupplierText() {
  const { user } = useProfile();
  const zh = user?.language === "ZH";
  return (en: string, z: string) => (zh ? z : en);
}
