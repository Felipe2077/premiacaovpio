// apps/web/src/app/page.tsx
'use client'; // Precisa ser client component para usar hooks como useQuery

import { useQuery } from '@tanstack/react-query';

// Função para buscar os dados da nossa API backend
const fetchPocData = async () => {
  // ATENÇÃO: A porta 3001 é onde nossa API (apps/api) está rodando!
  const res = await fetch('http://localhost:3001/api/poc-data');
  if (!res.ok) {
    throw new Error('Erro ao buscar dados da API');
  }
  return res.json();
};

export default function HomePage() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['pocData'], // Chave única para este query
    queryFn: fetchPocData, // Função que busca os dados
  });

  return (
    <main className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>
        Demonstração MVP - Dados da PoC
      </h1>

      {isLoading && <p>Carregando dados da API...</p>}

      {error && <p className='text-red-500'>Erro: {error.message}</p>}

      {isFetching && <p>Buscando atualizações...</p>}

      {data && (
        <div>
          <h2 className='text-xl mb-2'>
            Dados Recebidos ({Array.isArray(data) ? data.length : 0} registros):
          </h2>
          {/* Opção 1: Mostrar JSON (mais rápido de implementar) */}
          <pre className='bg-gray-100 p-2 rounded overflow-x-auto text-sm'>
            {JSON.stringify(data, null, 2)}
          </pre>

          {/* Opção 2: Tabela Simples (descomente se preferir) */}
          {/*
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Cod. OS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Num. OS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Abertura</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(data) && data.map((item: any, index: number) => (
                  <tr key={item.CODINTOS || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r">{item.CODIGOEMPRESA}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r">{item.CODINTOS}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r">{item.NUMEROOS}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.DATAABERTURAOS ? new Date(item.DATAABERTURAOS).toLocaleDateString('pt-BR') : '-'}</td>
                  </tr>
                ))}
                {!Array.isArray(data) && (
                  <tr><td colSpan={4} className="text-center p-4">Formato de dados inesperado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          */}
        </div>
      )}
    </main>
  );
}
