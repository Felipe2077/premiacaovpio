// apps/web/src/hooks/useWebSocket.ts
import { useNotificationActions } from '@/store/notification.store';
import type { NotificationDto } from '@sistema-premiacao/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Tipos para mensagens WebSocket
interface WebSocketMessage {
  type: 'notification' | 'heartbeat' | 'error' | 'connected' | 'disconnected';
  data?: any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  url?: string;
  enabled?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onNotification?: (notification: NotificationDto) => void;
}

export function useWebSocket({
  url,
  enabled = true,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
  heartbeatInterval = 30000,
  onConnect,
  onDisconnect,
  onError,
  onNotification,
}: UseWebSocketOptions = {}) {
  // Estado
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Actions do store
  const { addNotification, setWebSocketConnected } = useNotificationActions();

  // URL do WebSocket (pode ser configurável via env)
  const wsUrl =
    url ||
    `${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${typeof window !== 'undefined' ? window.location.host : ''}/ws`;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounted');
      wsRef.current = null;
    }
  }, []);

  // Enviar heartbeat
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          })
        );

        // Agendar próximo heartbeat
        heartbeatTimeoutRef.current = setTimeout(
          sendHeartbeat,
          heartbeatInterval
        );
      } catch (error) {
        console.error('Erro ao enviar heartbeat:', error);
      }
    }
  }, [heartbeatInterval]);

  // Conectar WebSocket
  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    // Limpar conexão existente
    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Event: Open
      ws.onopen = () => {
        if (!mountedRef.current) return;

        console.log('WebSocket conectado');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        setReconnectCount(0);
        setWebSocketConnected(true);

        // Iniciar heartbeat
        sendHeartbeat();

        onConnect?.();
      };

      // Event: Message
      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'notification':
              const notification = message.data as NotificationDto;

              // Adicionar ao store
              addNotification(notification);

              // Mostrar toast
              toast.info(notification.message, {
                description: `${getNotificationTypeLabel(notification.type)} • Agora`,
                action: notification.link
                  ? {
                      label: 'Ver',
                      onClick: () => {
                        if (typeof window !== 'undefined') {
                          window.location.href = notification.link!;
                        }
                      },
                    }
                  : undefined,
                duration: 5000,
              });

              // Callback externo
              onNotification?.(notification);
              break;

            case 'heartbeat':
              // Responder ao heartbeat do servidor
              break;

            case 'error':
              console.error('Erro do WebSocket:', message.data);
              toast.error('Erro na conexão de notificações');
              break;

            default:
              console.log('Mensagem WebSocket desconhecida:', message);
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      // Event: Close
      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        console.log('WebSocket desconectado:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        setWebSocketConnected(false);

        // Limpar heartbeat
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
          heartbeatTimeoutRef.current = null;
        }

        onDisconnect?.();

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && reconnectCount < reconnectAttempts) {
          setReconnectCount((prev) => prev + 1);

          const delay = reconnectInterval * Math.pow(1.5, reconnectCount); // Backoff exponencial
          console.log(
            `Tentativa de reconexão ${reconnectCount + 1}/${reconnectAttempts} em ${delay}ms`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        } else if (reconnectCount >= reconnectAttempts) {
          setConnectionError('Falha ao conectar após múltiplas tentativas');
          toast.error('Conexão de notificações perdida', {
            description: 'As notificações em tempo real não estão funcionando.',
            action: {
              label: 'Tentar novamente',
              onClick: () => {
                setReconnectCount(0);
                connect();
              },
            },
          });
        }
      };

      // Event: Error
      ws.onerror = (error) => {
        if (!mountedRef.current) return;

        console.error('Erro no WebSocket:', error);
        setConnectionError('Erro de conexão');
        onError?.(error);
      };
    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
      setIsConnecting(false);
      setConnectionError('Erro ao inicializar conexão');
    }
  }, [
    enabled,
    wsUrl,
    reconnectCount,
    reconnectAttempts,
    reconnectInterval,
    sendHeartbeat,
    addNotification,
    setWebSocketConnected,
    onConnect,
    onDisconnect,
    onError,
    onNotification,
  ]);

  // Desconectar manualmente
  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setIsConnecting(false);
    setWebSocketConnected(false);
    setReconnectCount(reconnectAttempts); // Prevenir reconexão automática
  }, [cleanup, setWebSocketConnected, reconnectAttempts]);

  // Reconectar manualmente
  const reconnect = useCallback(() => {
    setReconnectCount(0);
    setConnectionError(null);
    connect();
  }, [connect]);

  // Efeito para conectar/desconectar
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [enabled, connect, disconnect, cleanup]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    reconnectCount,
    connect: reconnect,
    disconnect,

    // Estados derivados
    isReconnecting: isConnecting && reconnectCount > 0,
    hasConnectionIssues: connectionError !== null || reconnectCount > 0,
  };
}

// Função auxiliar para labels dos tipos
function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    EXPURGO_SOLICITADO: 'Expurgo Solicitado',
    EXPURGO_APROVADO: 'Expurgo Aprovado',
    EXPURGO_REJEITADO: 'Expurgo Rejeitado',
    ETL_CONCLUIDO: 'ETL Concluído',
    ETL_FALHOU: 'ETL Falhou',
    INFO: 'Informação',
    AVISO: 'Aviso',
    ERRO: 'Erro',
  };

  return labels[type] || 'Notificação';
}
