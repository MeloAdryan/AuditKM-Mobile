import AsyncStorage from
  '@react-native-async-storage/async-storage';

import * as Location from
  'expo-location';

import * as TaskManager from
  'expo-task-manager';

import api from './api';


export const BACKGROUND_LOCATION_TASK =
  'auditkm-background-location';


const ACTIVE_TRIP_KEY =
  '@AuditKM:background-active-trip';


const OFFLINE_LOCATION_QUEUE_KEY =
  '@AuditKM:offline-location-queue';


/*
 * Aproximadamente 20 horas se o aparelho
 * gerar um ponto a cada 15 segundos.
 *
 * É apenas uma proteção para impedir que
 * o AsyncStorage cresça indefinidamente.
 */
const MAX_OFFLINE_POINTS = 5000;


/*
 * Intervalo mínimo entre atualizações.
 */
const LOCATION_TIME_INTERVAL =
  15000;


/*
 * Distância mínima entre atualizações.
 */
const LOCATION_DISTANCE_INTERVAL =
  25;


interface BackgroundLocationTaskData {
  locations: Location.LocationObject[];
}


interface TripLocationPayload {
  latitude: number;

  longitude: number;

  accuracy:
    | number
    | null;

  speed:
    | number
    | null;

  altitude:
    | number
    | null;

  heading:
    | number
    | null;

  recorded_at: string;
}


interface OfflineLocationItem {
  tripId: number;

  payload: TripLocationPayload;

  queuedAt: string;
}


/*
 * ============================================================
 * LOCK SIMPLES DA FILA
 * ============================================================
 *
 * Evita duas operações simultâneas de leitura/escrita
 * no AsyncStorage da fila.
 */

let queueLock: Promise<void> =
  Promise.resolve();


async function withQueueLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const previousLock =
    queueLock;

  let releaseLock:
    () => void =
    () => {};

  queueLock =
    new Promise<void>(
      (resolve) => {
        releaseLock = resolve;
      },
    );

  await previousLock;

  try {
    return await operation();

  } finally {
    releaseLock();
  }
}


/*
 * ============================================================
 * HELPERS DO TRIP ATIVO
 * ============================================================
 */

async function saveActiveTripId(
  tripId: number,
): Promise<void> {
  await AsyncStorage.setItem(
    ACTIVE_TRIP_KEY,
    String(tripId),
  );
}


async function removeActiveTripId():
  Promise<void> {
  await AsyncStorage.removeItem(
    ACTIVE_TRIP_KEY,
  );
}


export async function getBackgroundActiveTripId():
  Promise<number | null> {
  const storedTripId =
    await AsyncStorage.getItem(
      ACTIVE_TRIP_KEY,
    );

  if (!storedTripId) {
    return null;
  }

  const tripId =
    Number(storedTripId);

  if (
    !Number.isInteger(tripId) ||
    tripId <= 0
  ) {
    return null;
  }

  return tripId;
}


/*
 * ============================================================
 * PAYLOAD
 * ============================================================
 */

function createLocationPayload(
  location: Location.LocationObject,
): TripLocationPayload {
  const {
    coords,
    timestamp,
  } = location;

  return {
    latitude:
      coords.latitude,

    longitude:
      coords.longitude,

    accuracy:
      coords.accuracy,

    speed:
      coords.speed,

    altitude:
      coords.altitude,

    heading:
      coords.heading,

    recorded_at:
      new Date(
        timestamp,
      ).toISOString(),
  };
}


/*
 * ============================================================
 * FILA OFFLINE
 * ============================================================
 */

async function readOfflineQueue():
  Promise<OfflineLocationItem[]> {
  try {
    const stored =
      await AsyncStorage.getItem(
        OFFLINE_LOCATION_QUEUE_KEY,
      );

    if (!stored) {
      return [];
    }

    const parsed =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as OfflineLocationItem[];

  } catch (error) {
    console.error(
      '[BackgroundLocation] Erro ao ler fila offline:',
      error,
    );

    return [];
  }
}


async function saveOfflineQueue(
  queue: OfflineLocationItem[],
): Promise<void> {
  /*
   * Mantemos os pontos mais recentes caso
   * a fila ultrapasse o limite.
   */
  const limitedQueue =
    queue.slice(
      -MAX_OFFLINE_POINTS,
    );

  if (limitedQueue.length === 0) {
    await AsyncStorage.removeItem(
      OFFLINE_LOCATION_QUEUE_KEY,
    );

    return;
  }

  await AsyncStorage.setItem(
    OFFLINE_LOCATION_QUEUE_KEY,
    JSON.stringify(
      limitedQueue,
    ),
  );
}


async function enqueueOfflineLocation(
  tripId: number,
  payload: TripLocationPayload,
): Promise<void> {
  await withQueueLock(
    async () => {
      const queue =
        await readOfflineQueue();

      queue.push({
        tripId,
        payload,

        queuedAt:
          new Date()
            .toISOString(),
      });

      await saveOfflineQueue(
        queue,
      );

      console.warn(
        '[BackgroundLocation] Ponto salvo na fila offline.',
        {
          tripId,

          queueSize:
            Math.min(
              queue.length,
              MAX_OFFLINE_POINTS,
            ),
        },
      );
    },
  );
}


/*
 * Informa se vale a pena tentar novamente
 * futuramente.
 *
 * Sem response:
 * normalmente erro de rede/timeout.
 *
 * 408:
 * timeout.
 *
 * 429:
 * servidor limitando requisições.
 *
 * 5xx:
 * problema temporário do servidor.
 *
 * Outros 4xx NÃO são enfileirados porque,
 * normalmente, reenviar não resolveria.
 */
function isRetryableError(
  error: unknown,
): boolean {
  if (
    typeof error !== 'object' ||
    error === null
  ) {
    return true;
  }

  const possibleError =
    error as {
      response?: {
        status?: number;
      };
    };

  const status =
    possibleError
      .response
      ?.status;

  if (status === undefined) {
    return true;
  }

  if (
    status === 408 ||
    status === 429
  ) {
    return true;
  }

  return status >= 500;
}


/*
 * ============================================================
 * ENVIO AO BACKEND
 * ============================================================
 */

async function sendPayloadToBackend(
  tripId: number,
  payload: TripLocationPayload,
): Promise<void> {
  await api.post(
    `/trips/${tripId}/locations/`,
    payload,
  );
}


export async function flushOfflineLocationQueue():
  Promise<{
    sent: number;
    remaining: number;
  }> {
  return withQueueLock(
    async () => {
      const queue =
        await readOfflineQueue();

      if (queue.length === 0) {
        return {
          sent: 0,
          remaining: 0,
        };
      }

      let sent = 0;

      const remaining:
        OfflineLocationItem[] = [];

      for (
        let index = 0;
        index < queue.length;
        index += 1
      ) {
        const item =
          queue[index];

        try {
          await sendPayloadToBackend(
            item.tripId,
            item.payload,
          );

          sent += 1;

        } catch (error: any) {
          if (
            isRetryableError(
              error,
            )
          ) {
            /*
             * Se a rede ainda está indisponível,
             * preservamos este ponto e todos os
             * seguintes.
             */
            remaining.push(
              ...queue.slice(index),
            );

            console.warn(
              '[BackgroundLocation] Sincronização offline interrompida.',
              error?.message ??
                error,
            );

            break;
          }

          /*
           * Erro permanente 4xx.
           *
           * Não deixamos esse item preso para
           * sempre na fila.
           */
          console.error(
            '[BackgroundLocation] Ponto offline descartado por erro permanente:',
            {
              tripId:
                item.tripId,

              status:
                error?.response
                  ?.status,

              data:
                error?.response
                  ?.data,
            },
          );
        }
      }

      await saveOfflineQueue(
        remaining,
      );

      console.log(
        '[BackgroundLocation] Sincronização da fila concluída.',
        {
          sent,

          remaining:
            remaining.length,
        },
      );

      return {
        sent,

        remaining:
          remaining.length,
      };
    },
  );
}


/*
 * ============================================================
 * TASK GLOBAL
 * ============================================================
 *
 * TaskManager.defineTask precisa permanecer
 * fora de componentes React e hooks.
 *
 * IMPORTANTE:
 *
 * Esta task é o ÚNICO produtor de pontos
 * GPS da viagem.
 *
 * O useTripTracking.ts apenas observa o
 * estado desta task e não cria outro
 * watchPositionAsync.
 */

TaskManager.defineTask(
  BACKGROUND_LOCATION_TASK,
  async ({
    data,
    error,
  }) => {
    if (error) {
      console.error(
        '[BackgroundLocation] Erro recebido pela task:',
        error.message,
      );

      return;
    }

    if (!data) {
      return;
    }

    try {
      const tripId =
        await getBackgroundActiveTripId();

      if (!tripId) {
        console.warn(
          '[BackgroundLocation] Nenhuma viagem ativa.',
        );

        return;
      }


      /*
       * Antes dos pontos novos tentamos
       * entregar o que ficou pendente.
       */
      try {
        await flushOfflineLocationQueue();

      } catch (flushError) {
        console.error(
          '[BackgroundLocation] Erro ao sincronizar fila:',
          flushError,
        );
      }


      const {
        locations,
      } =
        data as BackgroundLocationTaskData;


      if (
        !Array.isArray(locations) ||
        locations.length === 0
      ) {
        return;
      }


      /*
       * O Android pode entregar mais de uma
       * localização de uma vez.
       */
      for (
        const location
        of locations
      ) {
        const payload =
          createLocationPayload(
            location,
          );

        try {
          await sendPayloadToBackend(
            tripId,
            payload,
          );


          console.log(
            '[BackgroundLocation] Ponto enviado:',
            {
              tripId,

              latitude:
                payload.latitude,

              longitude:
                payload.longitude,

              recordedAt:
                payload.recorded_at,
            },
          );

        } catch (sendError: any) {
          if (
            isRetryableError(
              sendError,
            )
          ) {
            /*
             * Sem internet / timeout /
             * servidor temporariamente fora.
             */
            await enqueueOfflineLocation(
              tripId,
              payload,
            );

          } else {
            /*
             * 4xx permanente.
             *
             * Apenas registramos o erro.
             */
            console.error(
              '[BackgroundLocation] Ponto rejeitado pelo backend:',
              sendError?.response?.data ??
                sendError?.message ??
                sendError,
            );
          }
        }
      }

    } catch (taskError: any) {
      console.error(
        '[BackgroundLocation] Falha geral na task:',
        taskError?.message ??
          taskError,
      );
    }
  },
);


/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export async function isBackgroundTrackingRunning():
  Promise<boolean> {
  try {
    return await Location
      .hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
      );

  } catch (error) {
    console.error(
      '[BackgroundLocation] Erro ao consultar status:',
      error,
    );

    return false;
  }
}


/*
 * ============================================================
 * PERMISSÕES
 * ============================================================
 */

export async function ensureBackgroundLocationPermissions():
  Promise<void> {
  const foreground =
    await Location
      .getForegroundPermissionsAsync();

  let foregroundStatus =
    foreground.status;


  if (
    foregroundStatus
    !== Location.PermissionStatus.GRANTED
  ) {
    const requestedForeground =
      await Location
        .requestForegroundPermissionsAsync();

    foregroundStatus =
      requestedForeground.status;
  }


  if (
    foregroundStatus
    !== Location.PermissionStatus.GRANTED
  ) {
    throw new Error(
      'A permissão de localização em primeiro plano não foi concedida.',
    );
  }


  const background =
    await Location
      .getBackgroundPermissionsAsync();

  let backgroundStatus =
    background.status;


  if (
    backgroundStatus
    !== Location.PermissionStatus.GRANTED
  ) {
    const requestedBackground =
      await Location
        .requestBackgroundPermissionsAsync();

    backgroundStatus =
      requestedBackground.status;
  }


  if (
    backgroundStatus
    !== Location.PermissionStatus.GRANTED
  ) {
    throw new Error(
      'A permissão de localização em segundo plano não foi concedida.',
    );
  }
}


/*
 * ============================================================
 * INICIAR TRACKING
 * ============================================================
 */

export async function startBackgroundTripTracking(
  tripId: number,
): Promise<void> {
  if (
    !Number.isInteger(tripId) ||
    tripId <= 0
  ) {
    throw new Error(
      'ID da viagem inválido para rastreamento em background.',
    );
  }


  /*
   * 1. Primeiro confirmamos permissões.
   */
  await ensureBackgroundLocationPermissions();


  /*
   * 2. Depois verificamos se o Android já
   * possui a task ativa.
   */
  const alreadyRunning =
    await isBackgroundTrackingRunning();


  if (alreadyRunning) {
    /*
     * O Android já confirmou que o serviço
     * existe.
     *
     * Não iniciamos uma segunda task.
     *
     * Apenas associamos o serviço existente
     * à viagem correta.
     */
    await saveActiveTripId(
      tripId,
    );


    console.log(
      '[BackgroundLocation] Rastreamento já estava ativo.',
      {
        tripId,
      },
    );


    return;
  }


  let startedSuccessfully =
    false;


  try {
    /*
     * 3. Inicia efetivamente o serviço GPS.
     *
     * A coleta fica centralizada aqui.
     *
     * 15 segundos:
     * reduz requisições excessivas.
     *
     * 25 metros:
     * evita pontos praticamente idênticos
     * quando o veículo está parado ou se
     * deslocando muito pouco.
     */
    await Location
      .startLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
        {
          accuracy:
            Location.Accuracy.High,

          timeInterval:
            LOCATION_TIME_INTERVAL,

          distanceInterval:
            LOCATION_DISTANCE_INTERVAL,

          pausesUpdatesAutomatically:
            false,

          showsBackgroundLocationIndicator:
            false,

          foregroundService: {
            notificationTitle:
              'AuditKM',

            notificationBody:
              'Viagem em andamento. O trajeto está sendo registrado.',

            killServiceOnDestroy:
              false,
          },
        },
      );


    startedSuccessfully =
      true;


    /*
     * 4. Só agora, depois que o Android
     * confirmou o início, salvamos tripId.
     */
    await saveActiveTripId(
      tripId,
    );


    /*
     * Já aproveitamos qualquer conexão
     * disponível para sincronizar pontos
     * antigos.
     */
    try {
      await flushOfflineLocationQueue();

    } catch (flushError) {
      console.error(
        '[BackgroundLocation] Não foi possível sincronizar fila ao iniciar:',
        flushError,
      );
    }


    console.log(
      '[BackgroundLocation] Rastreamento iniciado.',
      {
        tripId,

        timeInterval:
          LOCATION_TIME_INTERVAL,

        distanceInterval:
          LOCATION_DISTANCE_INTERVAL,
      },
    );

  } catch (error) {
    /*
     * Não deixa tripId falso armazenado.
     */
    await removeActiveTripId();


    /*
     * Se o Android chegou a iniciar o
     * serviço, mas falhou ao persistir o ID,
     * desfazemos o serviço também.
     */
    if (startedSuccessfully) {
      try {
        await Location
          .stopLocationUpdatesAsync(
            BACKGROUND_LOCATION_TASK,
          );

      } catch (stopError) {
        console.error(
          '[BackgroundLocation] Erro no rollback do tracking:',
          stopError,
        );
      }
    }


    console.error(
      '[BackgroundLocation] Falha ao iniciar rastreamento:',
      error,
    );


    throw error;
  }
}


/*
 * ============================================================
 * PARAR TRACKING
 * ============================================================
 */

export async function stopBackgroundTripTracking():
  Promise<void> {
  try {
    const running =
      await isBackgroundTrackingRunning();


    if (running) {
      await Location
        .stopLocationUpdatesAsync(
          BACKGROUND_LOCATION_TASK,
        );
    }

  } finally {
    await removeActiveTripId();


    console.log(
      '[BackgroundLocation] Rastreamento encerrado.',
    );
  }
}


/*
 * ============================================================
 * ESTADO
 * ============================================================
 */

export async function getBackgroundTrackingState():
  Promise<{
    active: boolean;
    tripId: number | null;
  }> {
  const [
    tripId,
    active,
  ] = await Promise.all([
    getBackgroundActiveTripId(),
    isBackgroundTrackingRunning(),
  ]);


  return {
    active,
    tripId,
  };
}


/*
 * ============================================================
 * INFORMAÇÕES DA FILA
 * ============================================================
 */

export async function getOfflineLocationQueueSize():
  Promise<number> {
  const queue =
    await readOfflineQueue();


  return queue.length;
}