export const mapMedicationMethod = (method: string): string => {
  const methodMap: Record<string, string> = {
    ORAL: 'ORAL_PILL',
    oral: 'ORAL_PILL',
    Oral: 'ORAL_PILL',
    PILL: 'ORAL_PILL',
    LIQUID: 'ORAL_LIQUID',
    DROPS: 'EYE_DROPS',
  };

  return methodMap[method] || method;
};
