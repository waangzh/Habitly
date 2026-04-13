export const decimalTransformer = {
  to(value: number): number {
    return value;
  },
  from(value: string | number | null): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value);
  },
};
