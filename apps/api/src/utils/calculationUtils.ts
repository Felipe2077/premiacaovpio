export const calculateAverage = (data: any[], count: number): number | null => {
  const validData = data
    .filter(
      (item) =>
        item.valorRealizado !== null && !isNaN(Number(item.valorRealizado))
    )
    .slice(0, count);
  if (validData.length === 0) return null;
  const sum = validData.reduce(
    (acc, item) => acc + Number(item.valorRealizado),
    0
  );
  return sum / validData.length;
};

export const getLastValue = (data: any[]): number | null => {
  const validData = data.filter(
    (item) =>
      item.valorRealizado !== null && !isNaN(Number(item.valorRealizado))
  );
  return validData.length > 0 ? Number(validData[0].valorRealizado) : null;
};

export const getBestValue = (
  data: any[],
  count: number,
  betterDirection: 'MAIOR' | 'MENOR' | undefined
): number | null => {
  const validData = data
    .filter(
      (item) =>
        item.valorRealizado !== null && !isNaN(Number(item.valorRealizado))
    )
    .slice(0, count);
  if (validData.length === 0) return null;
  const values = validData.map((item) => Number(item.valorRealizado));
  if (betterDirection === 'MAIOR') return Math.max(...values);
  if (betterDirection === 'MENOR') return Math.min(...values); // Adicionado para clareza
  return null; // Ou alguma lógica de fallback se betterDirection for undefined
};

export const applyAdjustment = (
  value: number,
  adjustmentPercentageStr: string
): number => {
  const adjustment = parseFloat(adjustmentPercentageStr);
  if (isNaN(adjustment) || adjustment === 0) return value; // Retorna o valor se o ajuste for NaN ou 0
  return value * (1 + adjustment / 100);
};

export const applyRounding = (
  value: number,
  roundingMethodValue: string,
  decimalPlacesStr: string
): number => {
  if (roundingMethodValue === 'none' || roundingMethodValue === '')
    return value;
  const places = parseInt(decimalPlacesStr, 10);
  if (isNaN(places) || places < 0) return value;
  const multiplier = Math.pow(10, places);
  switch (roundingMethodValue) {
    case 'nearest':
      return Math.round(value * multiplier) / multiplier;
    case 'up':
      return Math.ceil(value * multiplier) / multiplier;
    case 'down':
      return Math.floor(value * multiplier) / multiplier;
    default:
      return value;
  }
};

interface CalculateProposedMetaArgs {
  historicalData: any[]; // Deve conter objetos com valorRealizado
  calculationMethod: string; // ex: 'media3', 'ultimo', etc.
  adjustmentPercentage: string; // ex: '0', '10', '-5'
  roundingMethod: string;
  decimalPlaces: string;
  // Para 'melhorN', precisamos do sentido_melhor do critério.
  // Podemos buscar o critério ou passar o sentido_melhor diretamente.
  // Por simplicidade, vamos supor que quem chama esta função já tem o sentido_melhor se precisar.
  criterionBetterDirection?: 'MAIOR' | 'MENOR';
  // getCriterionById?: (id: number) => Criterion | undefined; // Alternativa se precisar buscar
  // criterionId?: number; // Para buscar o critério se getCriterionById for passado
}

export const calculateProposedMeta = ({
  historicalData,
  calculationMethod,
  adjustmentPercentage,
  roundingMethod,
  decimalPlaces,
  criterionBetterDirection,
}: CalculateProposedMetaArgs): number | null => {
  if (!historicalData || historicalData.length === 0) {
    return null;
  }

  let baseValue: number | null = null;
  switch (calculationMethod) {
    case 'media3':
      baseValue = calculateAverage(historicalData, 3);
      break;
    case 'media6':
      baseValue = calculateAverage(historicalData, 6);
      break;
    case 'ultimo':
      baseValue = getLastValue(historicalData);
      break;
    case 'melhor3':
      // Para 'melhor3', o sentido é crucial.
      // Se criterionBetterDirection não for fornecido, este método pode não funcionar como esperado.
      baseValue = getBestValue(historicalData, 3, criterionBetterDirection);
      break;
    // Adicione outros cases se tiver mais métodos
    default:
      baseValue = null;
  }

  if (baseValue === null) return null;

  const adjustedValue = applyAdjustment(baseValue, adjustmentPercentage);
  return applyRounding(adjustedValue, roundingMethod, decimalPlaces);
};
