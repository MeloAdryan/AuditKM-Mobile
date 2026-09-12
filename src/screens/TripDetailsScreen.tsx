import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  AppState,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import AppButton from '../components/AppButton';
import StatusBadge from '../components/StatusBadge';

import {
  useAuth,
} from '../contexts/AuthContext';

import {
  useTripTracking,
} from '../hooks/useTripTracking';

import type {
  RootStackParamList,
} from '../navigation/AppNavigator';

import api from '../services/api';

import {
  flushOfflineLocationQueue,
  getBackgroundTrackingState,
  getOfflineLocationQueueSize,
  startBackgroundTripTracking,
  stopBackgroundTripTracking,
} from '../services/backgroundLocation';

import type {
  Trip,
} from '../types/trip';


type Props = NativeStackScreenProps<
  RootStackParamList,
  'TripDetails'
>;


interface TripLocationItem {
  id: number;
  latitude: string | number;
  longitude: string | number;
  recorded_at: string;
}


type TripWithStandardRoute = Trip & {
  standard_route?: number | null;
};


export default function TripDetailsScreen({
  navigation,
  route,
}: Props) {
  const {
    tripId,
  } = route.params;

  const {
    user,
  } = useAuth();


  const [
    trip,
    setTrip,
  ] = useState<Trip | null>(
    null,
  );


  const [
    endKm,
    setEndKm,
  ] = useState('');


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    finishing,
    setFinishing,
  ] = useState(false);


  const [
    creatingStandardRoute,
    setCreatingStandardRoute,
  ] = useState(false);


  const [
    offlineQueueSize,
    setOfflineQueueSize,
  ] = useState(0);


  const [
    serverLocationCount,
    setServerLocationCount,
  ] = useState(0);


  const [
    lastServerLocationAt,
    setLastServerLocationAt,
  ] = useState<string | null>(
    null,
  );


  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  /*
   * =========================================================
   * PERFIL / PERMISSÕES
   * =========================================================
   */

  const roleName =
    user?.role?.name ?? null;


  const canCreateStandardRoute =
    Boolean(
      user?.is_superuser ||
      roleName === 'Administrador' ||
      roleName === 'Gestor',
    );


  const standardRouteId =
    (
      trip as TripWithStandardRoute | null
    )?.standard_route ?? null;


  const hasStandardRoute =
    standardRouteId !== null &&
    standardRouteId !== undefined;


  /*
   * =========================================================
   * RASTREAMENTO
   * =========================================================
   */

  const {
    tracking,
    lastSentAt,
    error: trackingError,
  } = useTripTracking({
    tripId,

    enabled:
      trip?.status ===
      'IN_PROGRESS',
  });


  /*
   * =========================================================
   * CARREGAR VIAGEM
   * =========================================================
   */

  const loadTrip =
    useCallback(
      async (
        showLoading = true,
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          const response =
            await api.get<Trip>(
              `/trips/${tripId}/`,
            );

          setTrip(
            response.data,
          );

          setError(null);

          if (
            response.data.end_km !== null
          ) {
            setEndKm(
              String(
                response.data.end_km,
              ),
            );
          }

        } catch (err) {
          console.error(
            'Erro ao carregar viagem:',
            err,
          );

          if (showLoading) {
            setError(
              'Não foi possível carregar a viagem.',
            );
          }

        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [
        tripId,
      ],
    );


  /*
   * =========================================================
   * PONTOS GPS NO SERVIDOR
   * =========================================================
   */

  const loadServerLocationCount =
    useCallback(
      async () => {
        try {
          const response =
            await api.get<
              TripLocationItem[]
            >(
              `/trips/${tripId}/locations/`,
            );

          const locations =
            Array.isArray(
              response.data,
            )
              ? response.data
              : [];

          setServerLocationCount(
            locations.length,
          );

          const lastLocation =
            locations.length > 0
              ? locations[
                  locations.length - 1
                ]
              : null;

          setLastServerLocationAt(
            lastLocation?.recorded_at ??
            null,
          );

        } catch (locationError) {
          console.error(
            'Erro ao consultar pontos GPS da viagem:',
            locationError,
          );
        }
      },
      [
        tripId,
      ],
    );


  /*
   * =========================================================
   * PRIMEIRA ABERTURA
   * =========================================================
   */

  useEffect(() => {
    loadTrip();
  }, [
    loadTrip,
  ]);


  /*
   * =========================================================
   * QUANDO A TELA RECEBE FOCO
   * =========================================================
   */

  useFocusEffect(
    useCallback(() => {
      loadTrip(false);
    }, [
      loadTrip,
    ]),
  );


  /*
   * =========================================================
   * VOLTA DO BACKGROUND
   * =========================================================
   */

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (
          nextState,
        ) => {
          if (
            nextState ===
            'active'
          ) {
            loadTrip(false);
          }
        },
      );

    return () => {
      subscription.remove();
    };
  }, [
    loadTrip,
  ]);


  /*
   * =========================================================
   * FILA GPS OFFLINE
   * =========================================================
   */

  useEffect(() => {
    if (
      !trip ||
      trip.status !==
        'IN_PROGRESS'
    ) {
      setOfflineQueueSize(0);

      return;
    }

    let mounted = true;

    async function updateOfflineQueueSize() {
      try {
        const size =
          await getOfflineLocationQueueSize();

        if (mounted) {
          setOfflineQueueSize(
            size,
          );
        }

      } catch (queueError) {
        console.error(
          'Erro ao consultar fila GPS offline:',
          queueError,
        );
      }
    }

    updateOfflineQueueSize();

    const interval =
      setInterval(
        () => {
          updateOfflineQueueSize();
        },
        3000,
      );

    return () => {
      mounted = false;

      clearInterval(
        interval,
      );
    };
  }, [
    trip,
  ]);


  /*
   * =========================================================
   * MONITOR DOS PONTOS NO SERVIDOR
   * =========================================================
   */

  useEffect(() => {
    if (
      !trip ||
      trip.status !==
        'IN_PROGRESS'
    ) {
      return;
    }

    loadServerLocationCount();

    const interval =
      setInterval(
        () => {
          loadServerLocationCount();
        },
        5000,
      );

    return () => {
      clearInterval(
        interval,
      );
    };
  }, [
    trip,
    loadServerLocationCount,
  ]);


  /*
   * =========================================================
   * BACKGROUND TRACKING
   * =========================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function ensureBackgroundTracking() {
      if (
        !trip ||
        cancelled
      ) {
        return;
      }

      if (
        trip.status !==
        'IN_PROGRESS'
      ) {
        try {
          const state =
            await getBackgroundTrackingState();

          if (
            state.tripId ===
            trip.id
          ) {
            await stopBackgroundTripTracking();
          }

        } catch (
          trackingStateError
        ) {
          console.error(
            'Erro ao verificar rastreamento encerrado:',
            trackingStateError,
          );
        }

        return;
      }

      try {
        const state =
          await getBackgroundTrackingState();

        if (cancelled) {
          return;
        }

        if (
          state.active &&
          state.tripId ===
            trip.id
        ) {
          return;
        }

        if (
          state.tripId !== null &&
          state.tripId !==
            trip.id
        ) {
          await stopBackgroundTripTracking();
        }

        if (cancelled) {
          return;
        }

        await startBackgroundTripTracking(
          trip.id,
        );

      } catch (
        trackingStartError
      ) {
        console.error(
          'Erro ao garantir rastreamento em background:',
          trackingStartError,
        );
      }
    }

    ensureBackgroundTracking();

    return () => {
      cancelled = true;
    };
  }, [
    trip,
  ]);


  /*
   * =========================================================
   * VALIDAR FINALIZAÇÃO
   * =========================================================
   */

  async function handleFinishTrip() {
    if (!trip) {
      return;
    }

    if (!endKm.trim()) {
      Alert.alert(
        'Quilometragem final',
        'Informe a quilometragem final.',
      );

      return;
    }

    const finalKm =
      Number(endKm);

    if (
      Number.isNaN(finalKm) ||
      !Number.isInteger(finalKm) ||
      finalKm < 0
    ) {
      Alert.alert(
        'Quilometragem inválida',
        'Informe uma quilometragem inteira válida.',
      );

      return;
    }

    if (
      trip.start_km !== null &&
      finalKm < trip.start_km
    ) {
      Alert.alert(
        'Quilometragem inválida',
        `O KM final não pode ser menor que ${trip.start_km}.`,
      );

      return;
    }

    Alert.alert(
      'Finalizar viagem',
      'Deseja realmente finalizar esta viagem?',
      [
        {
          text:
            'Cancelar',

          style:
            'cancel',
        },

        {
          text:
            'Finalizar',

          onPress:
            async () => {
              await finishTrip(
                finalKm,
              );
            },
        },
      ],
    );
  }


  /*
   * =========================================================
   * FINALIZAR VIAGEM
   * =========================================================
   */

  async function finishTrip(
    finalKm: number,
  ) {
    try {
      setFinishing(true);
      setError(null);

      /*
       * 1. Sincroniza fila offline.
       */
      const queueResult =
        await flushOfflineLocationQueue();

      setOfflineQueueSize(
        queueResult.remaining,
      );

      if (
        queueResult.remaining > 0
      ) {
        Alert.alert(
          'GPS pendente de sincronização',
          (
            `Ainda existem ${queueResult.remaining} ` +
            'ponto(s) GPS aguardando envio. ' +
            'Verifique sua conexão com a internet ' +
            'e tente finalizar novamente.'
          ),
        );

        return;
      }

      /*
       * 2. Finaliza a viagem no servidor.
       */
      const response =
        await api.patch<Trip>(
          `/trips/${tripId}/`,
          {
            end_km:
              finalKm,

            ended_at:
              new Date()
                .toISOString(),

            status:
              'COMPLETED',
          },
        );

      setTrip(
        response.data,
      );

      setEndKm(
        String(
          finalKm,
        ),
      );

      /*
       * 3. Encerra background tracking.
       */
      try {
        await stopBackgroundTripTracking();

      } catch (
        trackingStopError
      ) {
        console.error(
          'Erro ao encerrar rastreamento em background:',
          trackingStopError,
        );
      }

      Alert.alert(
        'Viagem finalizada',
        'A viagem foi finalizada com sucesso.',
      );

    } catch (err: any) {
      console.error(
        'Erro ao finalizar viagem:',
        err?.response?.data ??
        err,
      );

      const data =
        err?.response?.data;

      if (data?.end_km) {
        setError(
          String(
            data.end_km,
          ),
        );

      } else if (
        data?.ended_at
      ) {
        setError(
          String(
            data.ended_at,
          ),
        );

      } else if (
        data?.status
      ) {
        setError(
          String(
            data.status,
          ),
        );

      } else if (
        err?.response?.status ===
        403
      ) {
        setError(
          'Seu perfil não possui permissão para finalizar esta viagem.',
        );

      } else {
        setError(
          'Não foi possível finalizar a viagem.',
        );
      }

    } finally {
      setFinishing(false);
    }
  }


  /*
   * =========================================================
   * CRIAR ROTA PADRÃO A PARTIR DA VIAGEM
   * =========================================================
   */

  function handleCreateStandardRoute() {
    if (!trip) {
      return;
    }

    if (
      trip.status !==
      'COMPLETED'
    ) {
      Alert.alert(
        'Viagem não finalizada',
        'A rota padrão só pode ser criada a partir de uma viagem finalizada.',
      );

      return;
    }

    Alert.alert(
      'Criar rota padrão',
      (
        'O trajeto GPS desta viagem será usado como ' +
        'rota de referência para futuras auditorias. ' +
        'Deseja continuar?'
      ),
      [
        {
          text:
            'Cancelar',

          style:
            'cancel',
        },

        {
          text:
            'Criar rota',

          onPress:
            async () => {
              await createStandardRoute();
            },
        },
      ],
    );
  }


  async function createStandardRoute() {
    if (!trip) {
      return;
    }

    try {
      setCreatingStandardRoute(
        true,
      );

      setError(null);

      await api.post(
        `/trips/${trip.id}/create-standard-route/`,
      );

      /*
       * O backend associa a nova rota padrão
       * à viagem que serviu como referência.
       * Recarregamos a viagem para refletir isso.
       */
      await loadTrip(false);

      Alert.alert(
        'Rota padrão criada',
        (
          'A rota padrão foi criada com sucesso ' +
          'usando os pontos GPS desta viagem.'
        ),
      );

    } catch (err: any) {
      console.error(
        'Erro ao criar rota padrão:',
        err?.response?.data ??
        err,
      );

      const data =
        err?.response?.data;

      let message =
        'Não foi possível criar a rota padrão.';

      if (
        typeof data?.detail ===
        'string'
      ) {
        message =
          data.detail;

      } else if (
        Array.isArray(
          data?.detail,
        )
      ) {
        message =
          data.detail.join('\n');

      } else if (
        data?.locations
      ) {
        message =
          Array.isArray(
            data.locations,
          )
            ? data.locations.join('\n')
            : String(
                data.locations,
              );

      } else if (
        data?.trip
      ) {
        message =
          Array.isArray(
            data.trip,
          )
            ? data.trip.join('\n')
            : String(
                data.trip,
              );

      } else if (
        data?.standard_route
      ) {
        message =
          Array.isArray(
            data.standard_route,
          )
            ? data.standard_route.join(
                '\n',
              )
            : String(
                data.standard_route,
              );

      } else if (
        err?.response?.status ===
        403
      ) {
        message =
          (
            'Somente Gestor ou Administrador ' +
            'pode criar uma rota padrão.'
          );
      }

      Alert.alert(
        'Erro ao criar rota padrão',
        message,
      );

    } finally {
      setCreatingStandardRoute(
        false,
      );
    }
  }


  /*
   * =========================================================
   * ABRIR AUDITORIA
   * =========================================================
   */

  function handleOpenAudit() {
    navigation.navigate(
      'Audit',
      {
        tripId,
      },
    );
  }


  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Carregando viagem...
        </Text>
      </SafeAreaView>
    );
  }


  /*
   * =========================================================
   * ERRO INICIAL
   * =========================================================
   */

  if (
    error &&
    !trip
  ) {
    return (
      <SafeAreaView
        style={
          styles.center
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Erro
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          {error}
        </Text>

        <View
          style={
            styles.retry
          }
        >
          <AppButton
            title="Tentar novamente"
            onPress={
              () => {
                loadTrip();
              }
            }
          />
        </View>
      </SafeAreaView>
    );
  }


  if (!trip) {
    return null;
  }


  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={
            styles.title
          }
        >
          Viagem #{trip.id}
        </Text>


        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.label
            }
          >
            Motorista
          </Text>

          <Text
            style={
              styles.value
            }
          >
            {trip.driver_username}
          </Text>


          <Text
            style={
              styles.label
            }
          >
            Veículo
          </Text>

          <Text
            style={
              styles.value
            }
          >
            {trip.vehicle_plate}
          </Text>


          <Text
            style={
              styles.label
            }
          >
            Origem
          </Text>

          <Text
            style={
              styles.value
            }
          >
            {trip.origin}
          </Text>


          <Text
            style={
              styles.label
            }
          >
            Destino
          </Text>

          <Text
            style={
              styles.value
            }
          >
            {trip.destination}
          </Text>


          <Text
            style={
              styles.label
            }
          >
            KM inicial
          </Text>

          <Text
            style={
              styles.value
            }
          >
            {trip.start_km ??
              'Não informado'}
          </Text>


          {trip.end_km !== null && (
            <>
              <Text
                style={
                  styles.label
                }
              >
                KM final
              </Text>

              <Text
                style={
                  styles.value
                }
              >
                {trip.end_km}
              </Text>
            </>
          )}


          {trip.traveled_km !== null && (
            <>
              <Text
                style={
                  styles.label
                }
              >
                KM percorridos
              </Text>

              <Text
                style={
                  styles.value
                }
              >
                {trip.traveled_km} km
              </Text>
            </>
          )}


          <View
            style={
              styles.status
            }
          >
            {trip.status ===
              'IN_PROGRESS' && (
              <StatusBadge
                status="ATTENTION"
              />
            )}

            {trip.status ===
              'COMPLETED' && (
              <StatusBadge
                status="NORMAL"
              />
            )}

            {trip.status ===
              'CANCELLED' && (
              <StatusBadge
                status="JUSTIFIED"
              />
            )}
          </View>
        </View>


        {trip.status ===
          'IN_PROGRESS' && (
          <>
            <View
              style={
                styles.trackingBox
              }
            >
              <Text
                style={
                  styles.trackingTitle
                }
              >
                Rastreamento GPS
              </Text>

              <Text
                style={
                  styles.trackingText
                }
              >
                {tracking
                  ? 'Rastreamento GPS ativo.'
                  : 'Iniciando rastreamento GPS...'}
              </Text>

              <Text
                style={
                  styles.trackingDescription
                }
              >
                Sua localização será registrada
                automaticamente durante esta viagem.
              </Text>


              <View
                style={
                  styles.offlineQueueBox
                }
              >
                <Text
                  style={
                    styles.offlineQueueLabel
                  }
                >
                  Pontos GPS registrados
                </Text>

                <Text
                  style={[
                    styles.offlineQueueValue,
                    styles.offlineQueueSynced,
                  ]}
                >
                  {serverLocationCount}
                </Text>

                <Text
                  style={
                    styles.offlineQueueDescription
                  }
                >
                  Pontos recebidos pelo servidor
                  nesta viagem.
                </Text>

                {lastServerLocationAt && (
                  <Text
                    style={
                      styles.lastLocation
                    }
                  >
                    Último ponto no servidor:{' '}
                    {new Date(
                      lastServerLocationAt,
                    ).toLocaleTimeString(
                      'pt-BR',
                    )}
                  </Text>
                )}
              </View>


              <View
                style={
                  styles.offlineQueueBox
                }
              >
                <Text
                  style={
                    styles.offlineQueueLabel
                  }
                >
                  Pontos GPS aguardando sincronização
                </Text>

                <Text
                  style={[
                    styles.offlineQueueValue,

                    offlineQueueSize > 0
                      ? styles.offlineQueuePending
                      : styles.offlineQueueSynced,
                  ]}
                >
                  {offlineQueueSize}
                </Text>

                <Text
                  style={
                    styles.offlineQueueDescription
                  }
                >
                  {offlineQueueSize > 0
                    ? (
                        'Os pontos estão protegidos no ' +
                        'celular e serão enviados quando ' +
                        'o servidor estiver acessível.'
                      )
                    : (
                        'Nenhum ponto GPS está pendente ' +
                        'no celular.'
                      )}
                </Text>
              </View>


              {lastSentAt && (
                <Text
                  style={
                    styles.lastLocation
                  }
                >
                  Último ponto enviado:{' '}
                  {lastSentAt}
                </Text>
              )}


              {trackingError && (
                <View
                  style={
                    styles.trackingErrorBox
                  }
                >
                  <Text
                    style={
                      styles.trackingErrorText
                    }
                  >
                    {trackingError}
                  </Text>
                </View>
              )}


              <View
                style={
                  styles.trackingStatusRow
                }
              >
                <View
                  style={[
                    styles.trackingIndicator,

                    tracking
                      ? styles.trackingIndicatorActive
                      : styles.trackingIndicatorInactive,
                  ]}
                />

                <Text
                  style={
                    styles.trackingStatusText
                  }
                >
                  {tracking
                    ? 'GPS monitorando'
                    : 'GPS aguardando'}
                </Text>
              </View>
            </View>


            <View
              style={
                styles.finishBox
              }
            >
              <Text
                style={
                  styles.finishTitle
                }
              >
                Finalizar viagem
              </Text>

              <Text
                style={
                  styles.finishText
                }
              >
                Informe a quilometragem atual do veículo.
              </Text>

              <TextInput
                style={
                  styles.input
                }
                placeholder="KM final"
                keyboardType="numeric"
                value={
                  endKm
                }
                onChangeText={
                  setEndKm
                }
                editable={
                  !finishing
                }
              />


              {error && (
                <Text
                  style={
                    styles.formError
                  }
                >
                  {error}
                </Text>
              )}


              <AppButton
                title="Finalizar viagem"
                onPress={
                  handleFinishTrip
                }
                loading={
                  finishing
                }
              />
            </View>
          </>
        )}


        {trip.status ===
          'COMPLETED' && (
          <View
            style={
              styles.completedBox
            }
          >
            <Text
              style={
                styles.completedTitle
              }
            >
              Viagem finalizada
            </Text>

            <Text
              style={
                styles.completedText
              }
            >
              O rastreamento foi encerrado e os dados
              desta viagem foram armazenados.
            </Text>


            {hasStandardRoute ? (
              <View
                style={
                  styles.routeCreatedBox
                }
              >
                <Text
                  style={
                    styles.routeCreatedTitle
                  }
                >
                  Rota padrão associada
                </Text>

                <Text
                  style={
                    styles.routeCreatedText
                  }
                >
                  Esta viagem já possui uma rota
                  padrão associada.
                </Text>
              </View>
            ) : (
              canCreateStandardRoute && (
                <View
                  style={
                    styles.standardRouteBox
                  }
                >
                  <Text
                    style={
                      styles.standardRouteTitle
                    }
                  >
                    Criar rota de referência
                  </Text>

                  <Text
                    style={
                      styles.standardRouteText
                    }
                  >
                    Use os pontos GPS desta viagem
                    como rota padrão para futuras
                    auditorias entre esta origem e
                    destino.
                  </Text>

                  <View
                    style={
                      styles.standardRouteButtonContainer
                    }
                  >
                    <AppButton
                      title="Criar rota padrão desta viagem"
                      onPress={
                        handleCreateStandardRoute
                      }
                      loading={
                        creatingStandardRoute
                      }
                      disabled={
                        creatingStandardRoute
                      }
                    />
                  </View>
                </View>
              )
            )}


            <View
              style={
                styles.auditButtonContainer
              }
            >
              <AppButton
                title="Ver auditoria"
                onPress={
                  handleOpenAudit
                }
              />
            </View>
          </View>
        )}


        {trip.status ===
          'CANCELLED' && (
          <View
            style={
              styles.cancelledBox
            }
          >
            <Text
              style={
                styles.cancelledTitle
              }
            >
              Viagem cancelada
            </Text>

            <Text
              style={
                styles.cancelledText
              }
            >
              Esta viagem foi cancelada e
              não pode ser retomada.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F4F6F8',
    },

    content: {
      padding: 18,
      paddingBottom: 40,
    },

    center: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#F4F6F8',
      padding: 24,
    },

    title: {
      fontSize: 28,
      fontWeight:
        'bold',
      color:
        '#263238',
      marginBottom: 18,
    },

    card: {
      backgroundColor:
        '#FFFFFF',
      padding: 18,
      borderRadius: 12,
    },

    label: {
      marginTop: 14,
      color:
        '#78909C',
      fontSize: 13,
    },

    value: {
      marginTop: 3,
      fontSize: 16,
      fontWeight:
        '600',
      color:
        '#263238',
    },

    status: {
      marginTop: 18,
    },

    trackingBox: {
      marginTop: 18,
      backgroundColor:
        '#E3F2FD',
      padding: 16,
      borderRadius: 12,
    },

    trackingTitle: {
      fontSize: 17,
      fontWeight:
        'bold',
      color:
        '#0D47A1',
    },

    trackingText: {
      marginTop: 8,
      color:
        '#263238',
      fontWeight:
        '600',
    },

    trackingDescription: {
      marginTop: 5,
      color:
        '#455A64',
      lineHeight: 20,
    },

    offlineQueueBox: {
      marginTop: 14,
      padding: 12,
      borderRadius: 10,
      backgroundColor:
        '#FFFFFF',
    },

    offlineQueueLabel: {
      color:
        '#455A64',
      fontSize: 13,
      fontWeight:
        '600',
    },

    offlineQueueValue: {
      marginTop: 4,
      fontSize: 24,
      fontWeight:
        'bold',
    },

    offlineQueuePending: {
      color:
        '#E65100',
    },

    offlineQueueSynced: {
      color:
        '#2E7D32',
    },

    offlineQueueDescription: {
      marginTop: 4,
      color:
        '#607D8B',
      fontSize: 12,
      lineHeight: 17,
    },

    lastLocation: {
      marginTop: 10,
      fontSize: 12,
      color:
        '#607D8B',
    },

    trackingErrorBox: {
      backgroundColor:
        '#FFEBEE',
      borderRadius: 8,
      padding: 10,
      marginTop: 12,
    },

    trackingErrorText: {
      color:
        '#C62828',
      fontSize: 13,
    },

    trackingStatusRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 14,
    },

    trackingIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },

    trackingIndicatorActive: {
      backgroundColor:
        '#2E7D32',
    },

    trackingIndicatorInactive: {
      backgroundColor:
        '#F9A825',
    },

    trackingStatusText: {
      color:
        '#455A64',
      fontSize: 13,
      fontWeight:
        '600',
    },

    finishBox: {
      marginTop: 18,
      backgroundColor:
        '#FFFFFF',
      padding: 18,
      borderRadius: 12,
    },

    finishTitle: {
      fontSize: 18,
      fontWeight:
        'bold',
      color:
        '#263238',
    },

    finishText: {
      marginTop: 6,
      marginBottom: 14,
      color:
        '#607D8B',
    },

    input: {
      borderWidth: 1,
      borderColor:
        '#CFD8DC',
      borderRadius: 10,
      padding: 14,
      marginBottom: 14,
      color:
        '#263238',
      backgroundColor:
        '#FFFFFF',
    },

    formError: {
      color:
        '#C62828',
      marginBottom: 12,
    },

    completedBox: {
      marginTop: 18,
      backgroundColor:
        '#E8F5E9',
      padding: 16,
      borderRadius: 12,
    },

    completedTitle: {
      color:
        '#2E7D32',
      fontWeight:
        'bold',
      fontSize: 17,
    },

    completedText: {
      marginTop: 6,
      color:
        '#455A64',
      lineHeight: 20,
    },

    standardRouteBox: {
      marginTop: 16,
      padding: 14,
      borderRadius: 10,
      backgroundColor:
        '#FFFFFF',
    },

    standardRouteTitle: {
      color:
        '#1565C0',
      fontSize: 16,
      fontWeight:
        'bold',
    },

    standardRouteText: {
      marginTop: 6,
      color:
        '#455A64',
      lineHeight: 20,
    },

    standardRouteButtonContainer: {
      marginTop: 14,
    },

    routeCreatedBox: {
      marginTop: 16,
      padding: 14,
      borderRadius: 10,
      backgroundColor:
        '#FFFFFF',
    },

    routeCreatedTitle: {
      color:
        '#2E7D32',
      fontWeight:
        'bold',
      fontSize: 15,
    },

    routeCreatedText: {
      marginTop: 5,
      color:
        '#455A64',
      lineHeight: 19,
    },

    auditButtonContainer: {
      marginTop: 16,
    },

    cancelledBox: {
      marginTop: 18,
      backgroundColor:
        '#FFF3E0',
      padding: 16,
      borderRadius: 12,
    },

    cancelledTitle: {
      color:
        '#E65100',
      fontWeight:
        'bold',
      fontSize: 17,
    },

    cancelledText: {
      marginTop: 6,
      color:
        '#455A64',
      lineHeight: 20,
    },

    loadingText: {
      marginTop: 10,
      color:
        '#607D8B',
    },

    errorTitle: {
      fontSize: 22,
      fontWeight:
        'bold',
      color:
        '#C62828',
    },

    errorText: {
      marginTop: 8,
      textAlign:
        'center',
      color:
        '#607D8B',
    },

    retry: {
      marginTop: 18,
      width:
        '100%',
    },
  });