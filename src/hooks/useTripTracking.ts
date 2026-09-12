import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  getBackgroundTrackingState,
} from '../services/backgroundLocation';


interface UseTripTrackingOptions {
  tripId: number;
  enabled: boolean;
}


export function useTripTracking({
  tripId,
  enabled,
}: UseTripTrackingOptions) {
  const [
    tracking,
    setTracking,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(
    null,
  );


  /*
   * ============================================================
   * STATUS DO RASTREAMENTO
   * ============================================================
   *
   * IMPORTANTE:
   *
   * Este hook NÃO coleta mais localização.
   * Ele também NÃO envia TripLocation
   * para o Django.
   *
   * O único responsável pela coleta GPS
   * persistente agora é:
   *
   * backgroundLocation.ts
   *        ↓
   * TaskManager
   *        ↓
   * fila offline
   *        ↓
   * Django
   *
   * Isso evita dois produtores enviando
   * os mesmos pontos simultaneamente.
   */


  const refreshTrackingState =
    useCallback(
      async () => {
        if (!enabled) {
          setTracking(
            false,
          );

          setError(
            null,
          );

          return;
        }


        try {
          const state =
            await getBackgroundTrackingState();


          const activeForCurrentTrip =
            (
              state.active &&
              state.tripId === tripId
            );


          setTracking(
            activeForCurrentTrip,
          );


          setError(
            null,
          );

        } catch (
          trackingError
        ) {
          console.error(
            'Erro ao consultar rastreamento GPS:',
            trackingError,
          );


          setTracking(
            false,
          );


          setError(
            'Não foi possível verificar o rastreamento GPS.',
          );
        }
      },
      [
        enabled,
        tripId,
      ],
    );


  /*
   * ============================================================
   * COMPATIBILIDADE COM A API ANTIGA DO HOOK
   * ============================================================
   *
   * Mantemos startTracking/stopTracking
   * porque outras telas já podem utilizar
   * essas propriedades.
   *
   * Elas NÃO iniciam ou encerram o
   * foreground service do Android.
   *
   * O controle nativo continua sendo feito
   * por:
   *
   * startBackgroundTripTracking()
   * stopBackgroundTripTracking()
   */


  const startTracking =
    useCallback(
      async () => {
        await refreshTrackingState();
      },
      [
        refreshTrackingState,
      ],
    );


  const stopTracking =
    useCallback(
      () => {
        setTracking(
          false,
        );

        setError(
          null,
        );
      },
      [],
    );


  /*
   * ============================================================
   * MONITOR VISUAL
   * ============================================================
   *
   * Consulta periodicamente se o serviço
   * background continua ativo para a viagem.
   *
   * Não solicita coordenadas.
   * Não cria LocationSubscription.
   * Não envia POST.
   */


  useEffect(() => {
    if (!enabled) {
      stopTracking();

      return;
    }


    let mounted =
      true;


    async function checkState() {
      try {
        const state =
          await getBackgroundTrackingState();


        if (!mounted) {
          return;
        }


        setTracking(
          (
            state.active &&
            state.tripId === tripId
          ),
        );


        setError(
          null,
        );

      } catch (
        trackingError
      ) {
        console.error(
          'Erro ao consultar rastreamento GPS:',
          trackingError,
        );


        if (!mounted) {
          return;
        }


        setTracking(
          false,
        );


        setError(
          'Não foi possível verificar o rastreamento GPS.',
        );
      }
    }


    checkState();


    const interval =
      setInterval(
        checkState,
        3000,
      );


    return () => {
      mounted =
        false;


      clearInterval(
        interval,
      );
    };

  }, [
    enabled,
    tripId,
    stopTracking,
  ]);


  /*
   * Antes este valor representava o último
   * POST realizado pelo foreground hook.
   *
   * Como o hook não envia mais coordenadas,
   * não fabricamos um horário falso.
   *
   * TripDetailsScreen simplesmente não
   * exibirá "Último ponto enviado" enquanto
   * esse valor for null.
   */
  const lastSentAt =
    null as string | null;


  return {
    tracking,
    lastSentAt,
    error,
    startTracking,
    stopTracking,
  };
}