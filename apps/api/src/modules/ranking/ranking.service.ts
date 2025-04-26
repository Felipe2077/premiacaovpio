// apps/api/src/modules/ranking/ranking.service.ts
import {
  mockRankingData,
  MockRankingEntry,
} from '@/database/mocks/ranking.mock'; // Importa o mock
// Usando o alias '@/' que configuramos no tsconfig.json da raiz,
// apontando para a pasta 'src' da API. Ajuste se o alias for diferente.
// Se o alias não funcionar, use o caminho relativo: ../../database/mocks/ranking.mock

export class RankingService {
  // No futuro, este serviço terá lógica real, usará repositórios, etc.
  // Por agora, apenas retorna o mock para o MVP.
  async getCurrentRanking(): Promise<MockRankingEntry[]> {
    console.log('[RankingService] Retornando dados MOCKADOS!'); // Log para sabermos que é mock
    await new Promise((resolve) => setTimeout(resolve, 50));
    return mockRankingData;
  }

  // Podemos adicionar métodos para histórico, etc. depois
}
