import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import InfoCard from '../components/InfoCard';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';

import type {
  RootStackParamList,
} from '../navigation/AppNavigator';

import {
  generateTripAudit,
  getTripAudit,
} from '../services/audit';

import api from '../services/api';

import {
  getStandardRoutes,
} from '../services/standardRoutes';

import {
  getStandardRouteWithPoints,
  getTripMapLocations,
} from '../services/tripMap';

import type {
  RouteAudit,
} from '../types/audit';

import type {
  StandardRoute,
} from '../types/standardRoute';

import type {
  MapCoordinate,
  StandardRouteWithPoints,
  TripLocationMapPoint,
} from '../types/tripMap';


type Props = NativeStackScreenProps<
  RootStackParamList,
  'Audit'
>;


function formatKm(
  value:
    | string
    | number
    | null,
) {
  if (value === null) {
    return '-';
  }

  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value);
  }

  return `${numericValue.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 3,
    },
  )} km`;
}


function formatDifferenceKm(
  value:
    | string
    | number,
) {
  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value);
  }

  const prefix =
    numericValue > 0
      ? '+'
      : '';

  return `${prefix}${numericValue.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 3,
    },
  )} km`;
}


function formatPercent(
  value:
    | string
    | number,
) {
  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value);
  }

  const prefix =
    numericValue > 0
      ? '+'
      : '';

  return `${prefix}${numericValue.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    },
  )}%`;
}


function formatMeters(
  value:
    | string
    | number,
) {
  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value);
  }

  return `${numericValue.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    },
  )} m`;
}


function getStatusDescription(
  status: RouteAudit['status'],
) {
  switch (status) {
    case 'NORMAL':
      return (
        'O trajeto ficou dentro da tolerância ' +
        'definida para a rota padrão.'
      );

    case 'ATTENTION':
      return (
        'O trajeto ultrapassou a tolerância ' +
        'esperada e merece atenção.'
      );

    case 'DIVERGENCE':
      return (
        'Foi identificada uma divergência ' +
        'relevante entre a rota padrão e ' +
        'o trajeto realizado.'
      );

    case 'JUSTIFIED':
      return (
        'A divergência desta viagem foi ' +
        'registrada como justificada.'
      );

    default:
      return (
        'Resultado da auditoria indisponível.'
      );
  }
}


function getErrorMessage(
  data: any,
) {
  if (!data) {
    return null;
  }

  if (data.standard_route) {
    return String(
      data.standard_route,
    );
  }

  if (data.trip) {
    return String(
      data.trip,
    );
  }

  if (data.status) {
    return String(
      data.status,
    );
  }

  if (data.non_field_errors) {
    return String(
      data.non_field_errors,
    );
  }

  if (data.detail) {
    return String(
      data.detail,
    );
  }

  return null;
}


function toMapCoordinate(
  latitude:
    | string
    | number,
  longitude:
    | string
    | number,
): MapCoordinate | null {
  const lat =
    Number(latitude);

  const lng =
    Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return {
    latitude: lat,
    longitude: lng,
  };
}


export default function AuditScreen({
  route,
}: Props) {
  const tripId =
    route.params?.tripId;


  const [
    audit,
    setAudit,
  ] = useState<RouteAudit | null>(
    null,
  );


  const [
    standardRoute,
    setStandardRoute,
  ] = useState<
    StandardRouteWithPoints | null
  >(
    null,
  );


  const [
    tripLocations,
    setTripLocations,
  ] = useState<
    TripLocationMapPoint[]
  >([]);


  const [
    routes,
    setRoutes,
  ] = useState<
    StandardRoute[]
  >([]);


  const [
    selectedRoute,
    setSelectedRoute,
  ] = useState<
    StandardRoute | null
  >(
    null,
  );


  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );


  const [
    routesLoading,
    setRoutesLoading,
  ] = useState(
    false,
  );


  const [
    generating,
    setGenerating,
  ] = useState(
    false,
  );


  const [
    mapLoading,
    setMapLoading,
  ] = useState(
    false,
  );


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(
    null,
  );


  const [
    mapError,
    setMapError,
  ] = useState<
    string | null
  >(
    null,
  );


  const mapRef =
    useRef<MapView | null>(
      null,
    );


  /*
   * Carrega a rota padrão completa,
   * incluindo seus pontos.
   */
  const loadStandardRouteData =
    useCallback(
      async (
        standardRouteId: number,
      ) => {
        try {
          const routeData =
            await getStandardRouteWithPoints(
              standardRouteId,
            );

          setStandardRoute(
            routeData,
          );

        } catch (err) {
          console.error(
            'Erro ao carregar dados da rota padrão:',
            err,
          );

          setStandardRoute(
            null,
          );
        }
      },
      [],
    );


  /*
   * Carrega os pontos GPS reais
   * registrados durante a viagem.
   */
  const loadTripMapData =
    useCallback(
      async (
        currentTripId: number,
      ) => {
        try {
          setMapLoading(
            true,
          );

          setMapError(
            null,
          );

          const locations =
            await getTripMapLocations(
              currentTripId,
            );

          setTripLocations(
            locations,
          );

        } catch (err: any) {
          console.error(
            'Erro ao carregar pontos GPS da viagem:',
            err?.response?.data ??
              err,
          );

          setTripLocations(
            [],
          );

          setMapError(
            'Não foi possível carregar os pontos GPS desta viagem.',
          );

        } finally {
          setMapLoading(
            false,
          );
        }
      },
      [],
    );


  /*
   * Carrega as rotas padrão disponíveis.
   */
  const loadRoutes =
    useCallback(
      async () => {
        try {
          setRoutesLoading(
            true,
          );

          const data =
            await getStandardRoutes();

          const activeRoutes =
            data.filter(
              (item) =>
                item.active,
            );

          setRoutes(
            activeRoutes,
          );

        } catch (err: any) {
          console.error(
            'Erro ao carregar rotas padrão:',
            err?.response?.data ??
              err,
          );

          setRoutes(
            [],
          );

        } finally {
          setRoutesLoading(
            false,
          );
        }
      },
      [],
    );


  /*
   * Procura uma auditoria já existente
   * para a viagem.
   */
  const loadAudit =
    useCallback(
      async () => {
        if (!tripId) {
          setLoading(
            false,
          );

          setAudit(
            null,
          );

          setStandardRoute(
            null,
          );

          setTripLocations(
            [],
          );

          setMapError(
            null,
          );

          return;
        }

        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          setMapError(
            null,
          );

          const data =
            await getTripAudit(
              tripId,
            );

          setAudit(
            data,
          );

          await Promise.all([
            loadStandardRouteData(
              data.standard_route,
            ),

            loadTripMapData(
              tripId,
            ),
          ]);

        } catch (err: any) {
          if (
            err?.response?.status ===
            404
          ) {
            /*
             * A viagem ainda não
             * possui auditoria.
             */
            setAudit(
              null,
            );

            setStandardRoute(
              null,
            );

            setTripLocations(
              [],
            );

            setMapError(
              null,
            );

            setError(
              null,
            );

          } else {
            console.error(
              'Erro ao carregar auditoria:',
              err?.response?.data ??
                err,
            );

            setError(
              'Não foi possível carregar a auditoria.',
            );
          }

        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        tripId,
        loadStandardRouteData,
        loadTripMapData,
      ],
    );


  useEffect(
    () => {
      loadAudit();
      loadRoutes();
    },
    [
      loadAudit,
      loadRoutes,
    ],
  );


  /*
   * Geração da auditoria:
   *
   * 1. seleciona a rota;
   * 2. vincula à viagem;
   * 3. gera auditoria;
   * 4. recarrega rota e GPS.
   */
  async function handleGenerateAudit() {
    if (!tripId) {
      setError(
        'Selecione uma viagem antes de gerar a auditoria.',
      );

      return;
    }

    if (!selectedRoute) {
      setError(
        'Selecione a rota padrão que será usada como referência.',
      );

      return;
    }

    try {
      setGenerating(
        true,
      );

      setError(
        null,
      );

      await api.patch(
        `/trips/${tripId}/`,
        {
          standard_route:
            selectedRoute.id,
        },
      );

      const data =
        await generateTripAudit(
          tripId,
        );

      setAudit(
        data,
      );

      await Promise.all([
        loadStandardRouteData(
          data.standard_route,
        ),

        loadTripMapData(
          tripId,
        ),
      ]);

    } catch (err: any) {
      console.error(
        'Erro ao gerar auditoria:',
        err?.response?.data ??
          err,
      );

      const message =
        getErrorMessage(
          err?.response?.data,
        );

      if (message) {
        setError(
          message,
        );

      } else if (
        err?.response?.status ===
        403
      ) {
        setError(
          'Seu perfil não possui permissão para gerar auditorias.',
        );

      } else {
        setError(
          'Não foi possível gerar a auditoria.',
        );
      }

    } finally {
      setGenerating(
        false,
      );
    }
  }


  /*
   * Converte os pontos da rota padrão
   * para o formato utilizado pelo mapa.
   */
  const standardRouteCoordinates =
    useMemo(
      () => {
        if (!standardRoute) {
          return [];
        }

        return [
          ...standardRoute.points,
        ]
          .sort(
            (a, b) =>
              a.sequence -
              b.sequence,
          )
          .map(
            (point) =>
              toMapCoordinate(
                point.latitude,
                point.longitude,
              ),
          )
          .filter(
            (
              coordinate,
            ): coordinate is MapCoordinate =>
              coordinate !== null,
          );
      },
      [
        standardRoute,
      ],
    );


  /*
   * Ordena os pontos GPS pela data real
   * da coleta e converte para o mapa.
   */
  const tripCoordinates =
    useMemo(
      () => {
        return [
          ...tripLocations,
        ]
          .sort(
            (a, b) => {
              const timeA =
                new Date(
                  a.recorded_at,
                ).getTime();

              const timeB =
                new Date(
                  b.recorded_at,
                ).getTime();

              if (
                timeA === timeB
              ) {
                return (
                  a.id -
                  b.id
                );
              }

              return (
                timeA -
                timeB
              );
            },
          )
          .map(
            (point) =>
              toMapCoordinate(
                point.latitude,
                point.longitude,
              ),
          )
          .filter(
            (
              coordinate,
            ): coordinate is MapCoordinate =>
              coordinate !== null,
          );
      },
      [
        tripLocations,
      ],
    );


  /*
   * Junta os dois trajetos somente
   * para calcular o enquadramento.
   */
  const allMapCoordinates =
    useMemo(
      () => [
        ...standardRouteCoordinates,
        ...tripCoordinates,
      ],
      [
        standardRouteCoordinates,
        tripCoordinates,
      ],
    );


  /*
   * Faz a câmera enquadrar toda
   * a rota automaticamente.
   */
  const fitMapToRoute =
    useCallback(
      () => {
        if (
          !mapRef.current ||
          allMapCoordinates.length ===
            0
        ) {
          return;
        }

        if (
          allMapCoordinates.length ===
          1
        ) {
          mapRef.current.animateToRegion(
            {
              ...allMapCoordinates[0],

              latitudeDelta:
                0.01,

              longitudeDelta:
                0.01,
            },
            400,
          );

          return;
        }

        mapRef.current.fitToCoordinates(
          allMapCoordinates,
          {
            edgePadding: {
              top: 55,
              right: 45,
              bottom: 55,
              left: 45,
            },

            animated: true,
          },
        );
      },
      [
        allMapCoordinates,
      ],
    );


  useEffect(
    () => {
      if (
        allMapCoordinates.length ===
        0
      ) {
        return;
      }

      const timeout =
        setTimeout(
          () => {
            fitMapToRoute();
          },
          400,
        );

      return () => {
        clearTimeout(
          timeout,
        );
      };
    },
    [
      allMapCoordinates,
      fitMapToRoute,
    ],
  );


  /*
   * Nenhuma viagem selecionada.
   */
  if (!tripId) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.emptyContainer
          }
        >
          <ScreenHeader
            title="Auditoria"
            subtitle="Análise dos trajetos realizados."
          />

          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              Selecione uma viagem
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              Abra uma viagem para consultar
              ou gerar a auditoria correspondente.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }


  /*
   * Carregamento inicial.
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
          Carregando auditoria...
        </Text>
      </SafeAreaView>
    );
  }


  /*
   * Auditoria ainda não criada.
   */
  if (!audit) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.emptyContainer
          }
        >
          <ScreenHeader
            title="Auditoria"
            subtitle={
              `Viagem #${tripId}`
            }
          />

          {error && (
            <View
              style={
                styles.errorBox
              }
            >
              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>
            </View>
          )}

          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              Auditoria ainda não gerada
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              Selecione a rota padrão que
              será utilizada como referência
              para comparar com o trajeto
              realizado.
            </Text>

            <Text
              style={
                styles.routeSelectionTitle
              }
            >
              Rota padrão
            </Text>

            {routesLoading ? (
              <View
                style={
                  styles.routesLoading
                }
              >
                <ActivityIndicator
                  size="small"
                />

                <Text
                  style={
                    styles.routesLoadingText
                  }
                >
                  Carregando rotas...
                </Text>
              </View>

            ) : routes.length ===
              0 ? (
              <View
                style={
                  styles.routeWarning
                }
              >
                <Text
                  style={
                    styles.routeWarningText
                  }
                >
                  Nenhuma rota padrão ativa
                  está disponível.
                </Text>
              </View>

            ) : (
              routes.map(
                (item) => {
                  const selected =
                    selectedRoute?.id ===
                    item.id;

                  return (
                    <TouchableOpacity
                      key={
                        item.id
                      }
                      style={[
                        styles.routeCard,

                        selected &&
                          styles.selectedRouteCard,
                      ]}
                      activeOpacity={
                        0.8
                      }
                      onPress={() => {
                        setSelectedRoute(
                          item,
                        );

                        setError(
                          null,
                        );
                      }}
                      disabled={
                        generating
                      }
                    >
                      <View
                        style={
                          styles.routeCardHeader
                        }
                      >
                        <Text
                          style={
                            styles.routeCardTitle
                          }
                        >
                          {item.name}
                        </Text>

                        {selected && (
                          <Text
                            style={
                              styles.routeSelectedText
                            }
                          >
                            Selecionada
                          </Text>
                        )}
                      </View>

                      <Text
                        style={
                          styles.routeCardText
                        }
                      >
                        {item.origin}
                        {' → '}
                        {item.destination}
                      </Text>

                      <Text
                        style={
                          styles.routeCardHelper
                        }
                      >
                        Distância padrão:{' '}

                        {Number(
                          item.expected_distance_km,
                        ).toLocaleString(
                          'pt-BR',
                          {
                            maximumFractionDigits:
                              3,
                          },
                        )}

                        {' km'}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )
            )}

            <TouchableOpacity
              style={[
                styles.generateButton,

                (
                  generating ||
                  !selectedRoute
                ) &&
                  styles.generateButtonDisabled,
              ]}
              onPress={
                handleGenerateAudit
              }
              disabled={
                generating ||
                !selectedRoute
              }
            >
              {generating ? (
                <>
                  <ActivityIndicator />

                  <Text
                    style={
                      styles.generatingText
                    }
                  >
                    Gerando auditoria...
                  </Text>
                </>

              ) : (
                <Text
                  style={
                    styles.generateButtonText
                  }
                >
                  Gerar auditoria
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }


  /*
   * Auditoria existente.
   */
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
      >
        <ScreenHeader
          title="Auditoria"
          subtitle={
            `Viagem #${audit.trip_id}`
          }
        />


        {error && (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        )}


        <View
          style={
            styles.summaryCard
          }
        >
          <View
            style={
              styles.summaryHeader
            }
          >
            <View
              style={
                styles.summaryText
              }
            >
              <Text
                style={
                  styles.vehiclePlate
                }
              >
                {audit.vehicle_plate}
              </Text>

              <Text
                style={
                  styles.driver
                }
              >
                Motorista:{' '}
                {audit.driver_username}
              </Text>

              <Text
                style={
                  styles.routeName
                }
              >
                {audit.route_name}
              </Text>
            </View>

            <StatusBadge
              status={
                audit.status
              }
            />
          </View>


          <View
            style={
              styles.routeContainer
            }
          >
            <Text
              style={
                styles.routeLabel
              }
            >
              Origem
            </Text>

            <Text
              style={
                styles.routeValue
              }
            >
              {audit.origin}
            </Text>

            <Text
              style={
                styles.arrow
              }
            >
              ↓
            </Text>

            <Text
              style={
                styles.routeLabel
              }
            >
              Destino
            </Text>

            <Text
              style={
                styles.routeValue
              }
            >
              {audit.destination}
            </Text>
          </View>
        </View>


        <Text
          style={
            styles.sectionTitle
          }
        >
          Comparação
        </Text>


        <InfoCard
          label="Rota padrão"
          value={
            formatKm(
              audit.standard_distance_km,
            )
          }
          helperText="Distância esperada da rota cadastrada"
        />


        <InfoCard
          label="Rota realizada"
          value={
            formatKm(
              audit.gps_distance_km,
            )
          }
          helperText="Distância calculada pelos pontos GPS"
        />


        <InfoCard
          label="Odômetro"
          value={
            formatKm(
              audit.odometer_distance_km,
            )
          }
          helperText="Diferença entre KM inicial e KM final"
        />


        <InfoCard
          label="Diferença"
          value={
            formatDifferenceKm(
              audit.difference_km,
            )
          }
          helperText={
            formatPercent(
              audit.difference_percent,
            )
          }
        />


        <Text
          style={
            styles.sectionTitle
          }
        >
          Análise espacial
        </Text>


        <InfoCard
          label="Pontos fora da rota"
          value={
            formatPercent(
              audit.spatial_deviation_percent,
            )
          }
          helperText={
            `${audit.outside_points_count} de ${audit.total_points_count} pontos fora do corredor`
          }
        />


        <InfoCard
          label="Maior afastamento"
          value={
            formatMeters(
              audit.max_deviation_m,
            )
          }
          helperText="Maior distância observada em relação à rota padrão"
        />


        {standardRoute && (
          <InfoCard
            label="Corredor permitido"
            value={
              `${standardRoute.corridor_tolerance_m} m`
            }
            helperText="Tolerância espacial configurada para esta rota"
          />
        )}


        <View
          style={
            styles.statusCard
          }
        >
          <StatusBadge
            status={
              audit.status
            }
          />

          <Text
            style={
              styles.statusTitle
            }
          >
            Resultado da auditoria
          </Text>

          <Text
            style={
              styles.statusDescription
            }
          >
            {getStatusDescription(
              audit.status,
            )}
          </Text>
        </View>


        {audit.justification ? (
          <>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Justificativa
            </Text>

            <View
              style={
                styles.justificationCard
              }
            >
              <Text
                style={
                  styles.justificationText
                }
              >
                {audit.justification}
              </Text>
            </View>
          </>

        ) : null}


        <Text
          style={
            styles.sectionTitle
          }
        >
          Mapa da rota
        </Text>


        <View
          style={
            styles.mapCard
          }
        >
          {mapLoading ? (
            <View
              style={
                styles.mapStateContainer
              }
            >
              <ActivityIndicator
                size="small"
              />

              <Text
                style={
                  styles.mapStateText
                }
              >
                Carregando pontos do mapa...
              </Text>
            </View>

          ) : mapError ? (
            <View
              style={
                styles.mapStateContainer
              }
            >
              <Text
                style={
                  styles.mapErrorTitle
                }
              >
                Não foi possível carregar o mapa
              </Text>

              <Text
                style={
                  styles.mapStateText
                }
              >
                {mapError}
              </Text>

              <TouchableOpacity
                style={
                  styles.mapRetryButton
                }
                onPress={() => {
                  loadTripMapData(
                    tripId,
                  );
                }}
              >
                <Text
                  style={
                    styles.mapRetryButtonText
                  }
                >
                  Tentar novamente
                </Text>
              </TouchableOpacity>
            </View>

          ) : allMapCoordinates.length >
            0 ? (
            <>
              <MapView
                ref={
                  mapRef
                }
                provider={
                  PROVIDER_GOOGLE
                }
                style={
                  styles.map
                }
                loadingEnabled
                toolbarEnabled={
                  false
                }
                rotateEnabled={
                  false
                }
                pitchEnabled={
                  false
                }
                onMapReady={() => {
                  fitMapToRoute();
                }}
                onLayout={() => {
                  fitMapToRoute();
                }}
              >
                {standardRouteCoordinates.length >=
                  2 && (
                  <Polyline
                    coordinates={
                      standardRouteCoordinates
                    }
                    strokeColor="#1565C0"
                    strokeWidth={
                      5
                    }
                    zIndex={
                      1
                    }
                  />
                )}


                {tripCoordinates.length >=
                  2 && (
                  <Polyline
                    coordinates={
                      tripCoordinates
                    }
                    strokeColor="#EF6C00"
                    strokeWidth={
                      4
                    }
                    zIndex={
                      2
                    }
                  />
                )}


                {tripCoordinates.length >
                  0 && (
                  <Marker
                    coordinate={
                      tripCoordinates[0]
                    }
                    title="Início da viagem"
                    description={
                      audit.origin
                    }
                    pinColor="#2E7D32"
                  />
                )}


                {tripCoordinates.length >
                  1 && (
                  <Marker
                    coordinate={
                      tripCoordinates[
                        tripCoordinates.length -
                          1
                      ]
                    }
                    title="Fim da viagem"
                    description={
                      audit.destination
                    }
                    pinColor="#C62828"
                  />
                )}
              </MapView>


              <View
                style={
                  styles.mapLegend
                }
              >
                <View
                  style={
                    styles.legendItem
                  }
                >
                  <View
                    style={[
                      styles.legendLine,
                      styles.standardRouteLegend,
                    ]}
                  />

                  <Text
                    style={
                      styles.legendText
                    }
                  >
                    Rota padrão
                  </Text>
                </View>


                <View
                  style={
                    styles.legendItem
                  }
                >
                  <View
                    style={[
                      styles.legendLine,
                      styles.tripRouteLegend,
                    ]}
                  />

                  <Text
                    style={
                      styles.legendText
                    }
                  >
                    Trajeto realizado
                  </Text>
                </View>
              </View>


              <View
                style={
                  styles.mapFooter
                }
              >
                <Text
                  style={
                    styles.mapFooterText
                  }
                >
                  {
                    standardRouteCoordinates.length
                  } pontos na rota padrão
                </Text>

                <Text
                  style={
                    styles.mapFooterText
                  }
                >
                  {
                    tripCoordinates.length
                  } pontos GPS da viagem
                </Text>
              </View>
            </>

          ) : (
            <View
              style={
                styles.mapStateContainer
              }
            >
              <Text
                style={
                  styles.mapErrorTitle
                }
              >
                Sem coordenadas para exibir
              </Text>

              <Text
                style={
                  styles.mapStateText
                }
              >
                Esta auditoria não possui
                coordenadas válidas suficientes
                para montar o mapa.
              </Text>
            </View>
          )}
        </View>
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
    },

    loadingText: {
      marginTop: 10,
      color:
        '#607D8B',
    },

    emptyContainer: {
      flexGrow: 1,
      padding: 18,
      paddingBottom: 40,
    },

    emptyCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      padding: 22,
      marginTop: 10,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight:
        'bold',
      color:
        '#263238',
    },

    emptyDescription: {
      marginTop: 8,
      color:
        '#607D8B',
      lineHeight: 20,
    },

    routeSelectionTitle: {
      marginTop: 22,
      marginBottom: 12,
      fontSize: 16,
      fontWeight:
        'bold',
      color:
        '#263238',
    },

    routesLoading: {
      minHeight: 80,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    routesLoadingText: {
      marginTop: 8,
      color:
        '#78909C',
    },

    routeWarning: {
      backgroundColor:
        '#FFF8E1',
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
    },

    routeWarningText: {
      color:
        '#795548',
      lineHeight: 19,
    },

    routeCard: {
      backgroundColor:
        '#FFFFFF',
      borderWidth: 2,
      borderColor:
        '#ECEFF1',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },

    selectedRouteCard: {
      borderColor:
        '#0D47A1',
      backgroundColor:
        '#F5F9FF',
    },

    routeCardHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    routeCardTitle: {
      flex: 1,
      marginRight: 10,
      fontSize: 16,
      fontWeight:
        'bold',
      color:
        '#263238',
    },

    routeCardText: {
      marginTop: 6,
      color:
        '#607D8B',
      lineHeight: 19,
    },

    routeCardHelper: {
      marginTop: 7,
      color:
        '#90A4AE',
      fontSize: 12,
    },

    routeSelectedText: {
      color:
        '#0D47A1',
      fontSize: 12,
      fontWeight:
        '600',
    },

    generateButton: {
      marginTop: 20,
      minHeight: 48,
      borderRadius: 10,
      backgroundColor:
        '#0D47A1',
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 14,
    },

    generateButtonDisabled: {
      opacity: 0.45,
    },

    generateButtonText: {
      color:
        '#FFFFFF',
      fontWeight:
        'bold',
    },

    generatingText: {
      marginTop: 5,
      color:
        '#FFFFFF',
      fontSize: 12,
    },

    errorBox: {
      backgroundColor:
        '#FFEBEE',
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
    },

    errorText: {
      color:
        '#C62828',
      lineHeight: 20,
    },

    summaryCard: {
      backgroundColor:
        '#FFFFFF',
      padding: 18,
      borderRadius: 14,
    },

    summaryHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
    },

    summaryText: {
      flex: 1,
      marginRight: 12,
    },

    vehiclePlate: {
      fontSize: 19,
      fontWeight:
        'bold',
      color:
        '#263238',
    },

    driver: {
      marginTop: 4,
      color:
        '#78909C',
    },

    routeName: {
      marginTop: 7,
      color:
        '#0D47A1',
      fontWeight:
        '600',
    },

    routeContainer: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor:
        '#ECEFF1',
    },

    routeLabel: {
      color:
        '#90A4AE',
      fontSize: 11,
    },

    routeValue: {
      marginTop: 2,
      color:
        '#37474F',
      fontWeight:
        'bold',
    },

    arrow: {
      marginVertical: 7,
      color:
        '#0D47A1',
      fontWeight:
        'bold',
    },

    sectionTitle: {
      marginTop: 24,
      marginBottom: 12,
      fontSize: 18,
      fontWeight:
        'bold',
      color:
        '#263238',
    },

    statusCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      padding: 17,
      marginTop: 8,
    },

    statusTitle: {
      marginTop: 12,
      fontSize: 17,
      fontWeight:
        'bold',
      color:
        '#263238',
    },

    statusDescription: {
      marginTop: 5,
      color:
        '#546E7A',
      lineHeight: 20,
    },

    justificationCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      padding: 17,
    },

    justificationText: {
      color:
        '#455A64',
      lineHeight: 20,
    },

    mapCard: {
      overflow:
        'hidden',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
    },

    map: {
      width:
        '100%',
      height: 380,
    },

    mapStateContainer: {
      minHeight: 220,
      padding: 22,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    mapStateText: {
      marginTop: 8,
      color:
        '#78909C',
      textAlign:
        'center',
      lineHeight: 20,
    },

    mapErrorTitle: {
      fontSize: 16,
      fontWeight:
        '600',
      color:
        '#263238',
      textAlign:
        'center',
    },

    mapRetryButton: {
      marginTop: 16,
      minHeight: 42,
      paddingHorizontal: 18,
      borderRadius: 9,
      backgroundColor:
        '#0D47A1',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    mapRetryButtonText: {
      color:
        '#FFFFFF',
      fontWeight:
        'bold',
    },

    mapLegend: {
      paddingHorizontal: 14,
      paddingTop: 13,
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      alignItems:
        'center',
    },

    legendItem: {
      marginRight: 18,
      marginBottom: 8,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    legendLine: {
      width: 28,
      height: 4,
      marginRight: 7,
      borderRadius: 2,
    },

    standardRouteLegend: {
      backgroundColor:
        '#1565C0',
    },

    tripRouteLegend: {
      backgroundColor:
        '#EF6C00',
    },

    legendText: {
      color:
        '#455A64',
      fontSize: 12,
      fontWeight:
        '600',
    },

    mapFooter: {
      paddingHorizontal: 14,
      paddingTop: 2,
      paddingBottom: 14,
    },

    mapFooterText: {
      color:
        '#78909C',
      fontSize: 12,
      marginTop: 3,
    },
  });