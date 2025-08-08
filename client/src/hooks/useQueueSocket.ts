import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface QueuePosition {
  tokenNumber: number | null;
  position: number | null;
  estimatedWaitTime: number;
  status?: string;
}

interface QueueUpdate {
  type: 'queue_position' | 'admin_queue_update';
  data: any;
}

export function useQueueSocket(patientId?: string, isAdmin = false) {
  const [queuePosition, setQueuePosition] = useState<QueuePosition | null>(null);
  const [queueTokens, setQueueTokens] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('🔥 Connecting to queue WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔥 Queue WebSocket connected');
        setIsConnected(true);
        
        // Subscribe to updates based on user type
        if (isAdmin) {
          wsRef.current?.send(JSON.stringify({ type: 'subscribe_admin_queue' }));
        } else if (patientId) {
          wsRef.current?.send(JSON.stringify({ type: 'subscribe_patient_queue', patientId }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const update: QueueUpdate = JSON.parse(event.data);
          console.log('🔥 Queue update received:', update);
          
          if (update.type === 'queue_position') {
            setQueuePosition(update.data);
          } else if (update.type === 'admin_queue_update') {
            setQueueTokens(update.data);
          }
        } catch (error) {
          console.error('Failed to parse queue update:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔥 Queue WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔥 Attempting to reconnect queue WebSocket...');
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('🔥 Queue WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [patientId, isAdmin]);

  const refreshQueue = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (isAdmin) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe_admin_queue' }));
      } else if (patientId) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe_patient_queue', patientId }));
      }
    }
  };

  return {
    queuePosition,
    queueTokens,
    isConnected,
    refreshQueue
  };
}