# Guia de Notificações da API

## 1. Introdução

Este documento detalha a funcionalidade de notificações implementada na API do Sistema de Premiação. O objetivo é fornecer um mecanismo robusto e escalável para informar usuários sobre eventos importantes no sistema, como solicitações e aprovações de expurgos, status de processos ETL, entre outros.

A implementação segue um padrão de **arquitetura orientada a eventos**, garantindo desacoplamento, resiliência e escalabilidade.

## 2. Arquitetura do Sistema de Notificações

O sistema de notificações é construído sobre uma arquitetura assíncrona e orientada a eventos, utilizando as seguintes tecnologias:

*   **Fastify**: Framework web para a API.
*   **TypeORM**: ORM para interação com o banco de dados PostgreSQL.
*   **BullMQ**: Biblioteca para gerenciamento de filas de mensagens, utilizando Redis como backend.
*   **Redis**: Armazena os jobs da fila e o estado do BullMQ.
*   **WebSockets**: Para entrega de notificações em tempo real ao frontend (implementação no frontend ainda pendente).

### Fluxo de uma Notificação

1.  **Gatilho (Trigger)**: Uma ação de negócio (ex: solicitação de expurgo, aprovação de expurgo) ocorre em um serviço da API (ex: `ExpurgoService`).
2.  **Emissão do Evento**: Em vez de enviar a notificação diretamente, o serviço de negócio adiciona um "job" à fila de notificações do BullMQ (`QueueService.addNotificationJob`). Este job contém os dados necessários para a notificação (tipo, mensagem, destinatário, link).
3.  **Processamento Assíncrono (Worker)**: Um processo Node.js separado (`notification.worker.ts`) está constantemente "ouvindo" a fila de notificações. Quando um novo job é adicionado, o worker o consome.
4.  **Persistência**: O worker utiliza o `NotificationService` para salvar a notificação no banco de dados (`notifications` table). Isso garante que as notificações sejam persistentes e possam ser consultadas a qualquer momento.
5.  **Despacho em Tempo Real (Futuro)**: Após salvar a notificação, o `NotificationService` (futuramente) instruirá o `WebSocketService` a enviar a notificação em tempo real para o usuário destinatário, se ele estiver online e conectado.
6.  **Consumo pelo Frontend**: O frontend pode:
    *   Consultar as notificações históricas através dos endpoints da API.
    *   Receber notificações em tempo real via WebSocket (quando implementado).

## 3. Endpoints da API de Notificações

Todas as rotas de notificação são protegidas e exigem autenticação via JWT (Bearer Token ou Cookie `session_token`).

### 3.1. Listar Notificações do Usuário Logado

`GET /api/notifications`

*   **Descrição**: Retorna uma lista das notificações mais recentes para o usuário autenticado.
*   **Autenticação**: Necessária (usuário logado).
*   **Parâmetros de Query**: Nenhum.
*   **Resposta (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "userId": 1,
        "type": "EXPURGO_SOLICITADO",
        "message": "O gerente Admin Sistema solicitou um novo expurgo para o setor PARANOÁ.",
        "link": "/admin/expurgos/40",
        "isRead": false,
        "createdAt": "2025-07-12T17:08:27.453Z"
      },
      {
        "id": 2,
        "userId": 1,
        "type": "ETL_CONCLUIDO",
        "message": "O processo ETL para o período 2025-06 foi concluído com sucesso.",
        "link": "/reports/etl-status",
        "isRead": true,
        "createdAt": "2025-07-10T10:00:00.000Z"
      }
    ]
    ```

### 3.2. Obter Contagem de Notificações Não Lidas

`GET /api/notifications/unread-count`

*   **Descrição**: Retorna a quantidade de notificações não lidas para o usuário autenticado.
*   **Autenticação**: Necessária (usuário logado).
*   **Parâmetros de Query**: Nenhum.
*   **Resposta (200 OK)**:
    ```json
    {
      "count": 1
    }
    ```

### 3.3. Marcar Notificação Específica como Lida

`POST /api/notifications/:id/read`

*   **Descrição**: Marca uma notificação específica como lida. O usuário só pode marcar suas próprias notificações.
*   **Autenticação**: Necessária (usuário logado).
*   **Parâmetros de Path**:
    *   `id` (number): ID da notificação a ser marcada como lida.
*   **Corpo da Requisição**: Nenhum.
*   **Resposta (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Notificação marcada como lida."
    }
    ```
*   **Resposta (404 Not Found)**: Se a notificação não for encontrada ou não pertencer ao usuário.
    ```json
    {
      "success": false,
      "message": "Notificação não encontrada ou não pertence ao usuário."
    }
    ```

### 3.4. Marcar Todas as Notificações como Lidas

`POST /api/notifications/mark-all-read`

*   **Descrição**: Marca todas as notificações não lidas do usuário autenticado como lidas.
*   **Autenticação**: Necessária (usuário logado).
*   **Parâmetros de Query**: Nenhum.
*   **Corpo da Requisição**: Nenhum.
*   **Resposta (200 OK)**:
    ```json
    {
      "success": true,
      "message": "2 notificações marcadas como lidas."
    }
    ```

## 4. Como as Notificações são Disparadas (Backend)

As notificações são disparadas adicionando jobs à fila `notifications` do BullMQ. Isso é feito através do `QueueService`.

### 4.1. Tipos de Notificação (`NotificationType` Enum)

O tipo da notificação é definido pelo enum `NotificationType` em `apps/api/src/entity/notification.entity.ts`:

```typescript
export enum NotificationType {
  // Expurgos
  EXPURGO_SOLICITADO = 'EXPURGO_SOLICITADO',
  EXPURGO_APROVADO = 'EXPURGO_APROVADO',
  EXPURGO_REJEITADO = 'EXPURGO_REJEITADO',
  
  // ETL & Sistema
  ETL_CONCLUIDO = 'ETL_CONCLUIDO',
  ETL_FALHOU = 'ETL_FALHOU',

  // Genérico
  INFO = 'INFO',
  AVISO = 'AVISO',
  ERRO = 'ERRO',
}
```

### 4.2. Estrutura do Job de Notificação (`NotificationJobData` DTO)

O job adicionado à fila segue a interface `NotificationJobData` (definida em `packages/shared-types/src/dto/notification.dto.ts`):

```typescript
export interface NotificationJobData {
  recipient: { userId?: number; userRole?: 'DIRETOR' | 'GERENTE' };
  type: string; // Corresponde a um valor de NotificationType
  message: string;
  link?: string;
}
```

*   `recipient`: Define quem deve receber a notificação. Pode ser um `userId` específico ou uma `userRole` (para notificar todos os usuários com aquela role).
*   `type`: O tipo da notificação, usado para categorização e possível renderização diferenciada no frontend.
*   `message`: O conteúdo textual da notificação.
*   `link`: (Opcional) Um URL relativo dentro da aplicação para onde o usuário deve ser direcionado ao clicar na notificação.

### 4.3. Exemplos de Disparo de Notificações

#### Exemplo 1: Expurgo Solicitado

Quando um gerente solicita um expurgo, uma notificação é enviada para todos os diretores.

*   **Local**: `apps/api/src/modules/expurgos/expurgo.service.ts` (método `requestExpurgo`)
*   **Código**:
    ```typescript
    // ... após salvar o expurgo e registrar a auditoria
    await this.queueService.addNotificationJob({
      recipient: { userRole: 'DIRETOR' }, // Notifica todos os diretores
      type: NotificationType.EXPURGO_SOLICITADO,
      message: `O gerente ${requestingUser.nome} solicitou um novo expurgo para o setor ${sector.nome}.`,
      link: `/admin/expurgos/${savedExpurgo.id}` // Link para a tela de aprovação
    });
    ```

#### Exemplo 2: Expurgo Aprovado

Quando um diretor aprova um expurgo, uma notificação é enviada de volta para o solicitante original.

*   **Local**: `apps/api/src/modules/expurgos/expurgo.service.ts` (método `approveExpurgoWithValue`)
*   **Código**:
    ```typescript
    // ... após aprovar o expurgo e registrar a auditoria
    await this.queueService.addNotificationJob({
      recipient: { userId: expurgo.registradoPorUserId }, // Notifica o solicitante
      type: NotificationType.EXPURGO_APROVADO,
      message: `Seu expurgo para o critério \"${expurgo.criterion?.nome}\" foi aprovado.`,
      link: `/expurgos/${updatedExpurgo.id}` // Link para o detalhe do expurgo
    });
    ```

#### Exemplo 3: Expurgo Rejeitado

Similarmente, quando um expurgo é rejeitado, o solicitante é notificado.

*   **Local**: `apps/api/src/modules/expurgos/expurgo.service.ts` (método `rejectExpurgo`)
*   **Código**:
    ```typescript
    // ... após rejeitar o expurgo e registrar a auditoria
    await this.queueService.addNotificationJob({
      recipient: { userId: expurgo.registradoPorUserId }, // Notifica o solicitante
      type: NotificationType.EXPURGO_REJEITADO,
      message: `Seu expurgo para o critério \"${expurgo.criterion?.nome}\" foi rejeitado.`,
      link: `/expurgos/${updatedExpurgo.id}` // Link para o detalhe do expurgo
    });
    ```

## 5. Execução do Worker de Notificações

Para que as notificações sejam processadas e salvas no banco de dados, o worker de notificações deve estar em execução.

### Em Ambiente de Desenvolvimento

Abra um terminal separado na raiz do projeto e execute:

```bash
pnpm --filter @sistema-premiacao/api run work:notifications
```

Você verá logs no terminal do worker indicando o processamento dos jobs.

### Em Ambiente de Produção

Em produção, o worker deve ser gerenciado por um sistema de orquestração de processos (ex: PM2, systemd, Docker Compose, Kubernetes) para garantir que ele esteja sempre em execução e seja reiniciado automaticamente em caso de falha. Ele deve ser executado como um processo em background, independente da API principal.

## 6. Considerações Finais

*   **Extensibilidade**: Novos tipos de notificação e novos canais de entrega (e-mail, SMS) podem ser facilmente adicionados ao sistema, bastando criar novos tipos de jobs ou estender a lógica do worker.
*   **Resiliência**: A fila BullMQ garante que as notificações não sejam perdidas mesmo se o worker ou a API falharem temporariamente. Os jobs serão reprocessados.
*   **Desacoplamento**: A lógica de negócio não precisa se preocupar com os detalhes de como a notificação é entregue, apenas com a emissão do evento.

Este guia fornece uma base sólida para entender e utilizar a funcionalidade de notificações na API.
