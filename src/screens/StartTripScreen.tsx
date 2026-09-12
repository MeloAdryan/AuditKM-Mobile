import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import * as ImagePicker from 'expo-image-picker';

import AppButton from '../components/AppButton';
import ScreenHeader from '../components/ScreenHeader';

import { useAuth } from '../contexts/AuthContext';

import type {
  RootStackParamList,
} from '../navigation/AppNavigator';

import api from '../services/api';

import {
  startBackgroundTripTracking,
} from '../services/backgroundLocation';

import {
  getStandardRoutes,
} from '../services/standardRoutes';

import type {
  StandardRoute,
} from '../types/standardRoute';


type Props = NativeStackScreenProps<
  RootStackParamList,
  'StartTrip'
>;

interface Vehicle {
  id: number;

  plate: string;

  brand: string;

  model: string;

  current_km: number;

  status: string;
}


interface Driver {
  id: number;

  username: string;

  first_name: string;

  last_name: string;
}


interface CreateTripResponse {
  id: number;

  driver: number;

  vehicle: number;

  standard_route:
    | number
    | null;

  origin: string;

  destination: string;

  start_km:
    | number
    | null;

  start_odometer_photo:
    | string
    | null;

  end_km:
    | number
    | null;

  end_odometer_photo:
    | string
    | null;

  started_at:
    | string
    | null;

  ended_at:
    | string
    | null;

  status: string;
}


function getDriverName(
  driver: Driver,
) {
  const fullName = [
    driver.first_name,
    driver.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    fullName ||
    driver.username
  );
}


export default function StartTripScreen({
  navigation,
}: Props) {
  const { user } = useAuth();


  const roleName =
    user?.role?.name ?? '';


  /*
   * Administrador e Gestor podem
   * criar uma viagem para outro
   * motorista.
   *
   * Motorista continua vinculado
   * à própria conta.
   */
  const canSelectDriver =
    roleName === 'Administrador' ||
    roleName === 'Gestor';


  const [
    drivers,
    setDrivers,
  ] = useState<Driver[]>([]);


  const [
    vehicles,
    setVehicles,
  ] = useState<Vehicle[]>([]);


  const [
    routes,
    setRoutes,
  ] = useState<
    StandardRoute[]
  >([]);


  const [
    selectedDriver,
    setSelectedDriver,
  ] = useState<
    Driver | null
  >(null);


  const [
    selectedVehicle,
    setSelectedVehicle,
  ] = useState<
    Vehicle | null
  >(null);


  const [
    selectedRoute,
    setSelectedRoute,
  ] = useState<
    StandardRoute | null
  >(null);


  const [
    origin,
    setOrigin,
  ] = useState('');


  const [
    destination,
    setDestination,
  ] = useState('');


  const [
    startKm,
    setStartKm,
  ] = useState('');


  const [
    startOdometerPhoto,
    setStartOdometerPhoto,
  ] = useState<ImagePicker.ImagePickerAsset | null>(
    null,
  );


  const [
    takingPhoto,
    setTakingPhoto,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    startingTrip,
    setStartingTrip,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          /*
           * Veículos são necessários para
           * qualquer perfil que possa iniciar
           * uma viagem.
           */
          const vehicleResponse =
            await api.get<Vehicle[]>(
              '/vehicles/',
            );


          const activeVehicles =
            vehicleResponse.data.filter(
              (vehicle) =>
                vehicle.status ===
                'ACTIVE',
            );


          setVehicles(
            activeVehicles,
          );


          /*
           * Administrador e Gestor continuam
           * carregando rotas padrão e a lista
           * de motoristas.
           *
           * Motorista não escolhe a rota usada
           * posteriormente pela auditoria.
           */
          if (canSelectDriver) {
            const [
              standardRoutes,
              driverResponse,
            ] = await Promise.all([
              getStandardRoutes(),

              api.get<Driver[]>(
                '/auth/drivers/',
              ),
            ]);


            const activeRoutes =
              standardRoutes.filter(
                (route) =>
                  route.active,
              );


            setRoutes(
              activeRoutes,
            );


            setDrivers(
              driverResponse.data,
            );

          } else {
            setRoutes([]);
            setSelectedRoute(null);

            setDrivers([]);
            setSelectedDriver(null);
          }

        } catch (err: any) {
          console.error(
            'Erro ao carregar dados:',
            err?.response?.data ??
              err,
          );


          if (
            err?.response?.status ===
            403
          ) {
            setError(
              'Seu perfil não possui permissão para carregar estes dados.',
            );
          } else {
            setError(
              'Não foi possível carregar os dados necessários para a viagem.',
            );
          }

        } finally {
          setLoading(false);
        }
      },
      [
        canSelectDriver,
      ],
    );


  useEffect(() => {
    loadData();
  }, [
    loadData,
  ]);


  function selectRoute(
    route: StandardRoute,
  ) {
    setSelectedRoute(
      route,
    );

    /*
     * Origem e destino vêm da rota
     * padrão cadastrada.
     */
    setOrigin(
      route.origin,
    );

    setDestination(
      route.destination,
    );
  }


  async function takeStartOdometerPhoto() {
    try {
      setTakingPhoto(true);


      const permission =
        await ImagePicker
          .requestCameraPermissionsAsync();


      if (!permission.granted) {
        Alert.alert(
          'Permissão da câmera',
          'O AuditKM precisa acessar a câmera para fotografar o odômetro.',
        );

        return;
      }


      const result =
        await ImagePicker
          .launchCameraAsync({
            mediaTypes: [
              'images',
            ],

            allowsEditing:
              false,

            quality:
              0.75,
          });


      if (result.canceled) {
        return;
      }


      const asset =
        result.assets?.[0];


      if (!asset) {
        Alert.alert(
          'Foto do odômetro',
          'Não foi possível obter a foto tirada.',
        );

        return;
      }


      setStartOdometerPhoto(
        asset,
      );

    } catch (photoError) {
      console.error(
        'Erro ao fotografar odômetro:',
        photoError,
      );

      Alert.alert(
        'Foto do odômetro',
        'Não foi possível abrir a câmera.',
      );

    } finally {
      setTakingPhoto(false);
    }
  }


  function validateForm() {
    if (!user) {
      Alert.alert(
        'Sessão inválida',
        'Não foi possível identificar o usuário.',
      );

      return false;
    }


    /*
     * Administrador/Gestor precisam
     * escolher quem realizará a
     * viagem.
     */
    if (
      canSelectDriver &&
      !selectedDriver
    ) {
      Alert.alert(
        'Motorista',
        'Selecione o motorista responsável pela viagem.',
      );

      return false;
    }

    if (!selectedVehicle) {
      Alert.alert(
        'Veículo',
        'Selecione um veículo.',
      );

      return false;
    }


    if (!origin.trim()) {
      Alert.alert(
        'Origem',
        'A origem da viagem é obrigatória.',
      );

      return false;
    }


    if (!destination.trim()) {
      Alert.alert(
        'Destino',
        'O destino da viagem é obrigatório.',
      );

      return false;
    }


    if (!startKm.trim()) {
      Alert.alert(
        'Quilometragem inicial',
        'Informe a quilometragem inicial.',
      );

      return false;
    }


    const km =
      Number(startKm);


    if (
      Number.isNaN(km) ||
      !Number.isInteger(km) ||
      km < 0
    ) {
      Alert.alert(
        'Quilometragem inválida',
        'Informe uma quilometragem inteira válida.',
      );

      return false;
    }


    if (
      km <
      selectedVehicle.current_km
    ) {
      Alert.alert(
        'Quilometragem inválida',
        `O veículo possui ${selectedVehicle.current_km.toLocaleString(
          'pt-BR',
        )} km registrados.`,
      );

      return false;
    }


    /*
     * O comprovante fotográfico é
     * obrigatório para o Motorista.
     * Gestor/Admin podem iniciar uma
     * viagem administrativa sem foto.
     */
    if (
      !canSelectDriver &&
      !startOdometerPhoto
    ) {
      Alert.alert(
        'Foto do odômetro',
        'Tire uma foto da quilometragem antes de iniciar a viagem.',
      );

      return false;
    }


    return true;
  }


  async function handleStartTrip() {
    if (!validateForm()) {
      return;
    }


    if (
      !user ||
      !selectedVehicle
    ) {
      return;
    }

    /*
     * Administrador/Gestor:
     * motorista selecionado.
     *
     * Motorista:
     * próprio usuário.
     */
    const driverId =
      canSelectDriver
        ? selectedDriver?.id
        : user.id;


    if (!driverId) {
      Alert.alert(
        'Motorista',
        'Não foi possível identificar o motorista da viagem.',
      );

      return;
    }


    try {
      setStartingTrip(true);
      setError(null);


      const formData =
        new FormData();


      formData.append(
        'driver',
        String(driverId),
      );

      formData.append(
        'vehicle',
        String(
          selectedVehicle.id,
        ),
      );


      if (
        canSelectDriver &&
        selectedRoute
      ) {
        formData.append(
          'standard_route',
          String(
            selectedRoute.id,
          ),
        );
      }


      formData.append(
        'origin',
        origin.trim(),
      );

      formData.append(
        'destination',
        destination.trim(),
      );

      formData.append(
        'start_km',
        String(
          Number(startKm),
        ),
      );

      formData.append(
        'started_at',
        new Date()
          .toISOString(),
      );

      formData.append(
        'status',
        'IN_PROGRESS',
      );

      formData.append(
        'notes',
        '',
      );


      if (startOdometerPhoto) {
        const uri =
          startOdometerPhoto.uri;

        const fileName =
          startOdometerPhoto.fileName ??
          `odometer-start-${Date.now()}.jpg`;

        const mimeType =
          startOdometerPhoto.mimeType ??
          'image/jpeg';


        formData.append(
          'start_odometer_photo',
          {
            uri,
            name:
              fileName,
            type:
              mimeType,
          } as any,
        );
      }


      const response =
        await api.post<CreateTripResponse>(
          '/trips/',
          formData,
          {
            headers: {
              'Content-Type':
                'multipart/form-data',
            },
          },
        );


      /*
       * A viagem já existe no Django.
       * Agora temos um tripId válido
       * para associar à task GPS.
       */
      const createdTrip =
        response.data;


      /*
       * Inicia o rastreamento de
       * localização em background.
       *
       * Caso o Android não conceda
       * a permissão, não apagamos
       * a viagem que já foi criada.
       */
      try {
        await startBackgroundTripTracking(
          createdTrip.id,
        );


        console.log(
          'Rastreamento em background iniciado.',
          {
            tripId:
              createdTrip.id,
          },
        );

      } catch (
        trackingError: unknown
      ) {
        console.error(
          'Erro ao iniciar rastreamento em background:',
          trackingError,
        );
      }


      Alert.alert(
        'Viagem iniciada',
        canSelectDriver &&
        selectedRoute
          ? `Rota: ${selectedRoute.name}`
          : (
              'A viagem foi iniciada e ' +
              'o rastreamento GPS está ativo.'
            ),
        [
          {
            text:
              'Continuar',

            onPress: () => {
              navigation.replace(
                'TripDetails',
                {
                  tripId:
                    createdTrip.id,
                },
              );
            },
          },
        ],
      );

    } catch (err: any) {
      console.error(
        'Erro ao iniciar viagem:',
        err?.response?.data ??
          err,
      );


      const data =
        err?.response?.data;


      if (
        data?.standard_route
      ) {
        setError(
          String(
            data.standard_route,
          ),
        );

      } else if (
        data?.vehicle
      ) {
        setError(
          String(
            data.vehicle,
          ),
        );

      } else if (
        data?.driver
      ) {
        setError(
          String(
            data.driver,
          ),
        );

      } else if (
        data?.start_km
      ) {
        setError(
          String(
            data.start_km,
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
        data?.non_field_errors
      ) {
        setError(
          String(
            data.non_field_errors,
          ),
        );

      } else if (
        data?.detail
      ) {
        setError(
          String(
            data.detail,
          ),
        );

      } else if (
        err?.response?.status ===
        403
      ) {
        setError(
          'Seu perfil não possui permissão para iniciar viagens.',
        );

      } else {
        setError(
          'Não foi possível iniciar a viagem.',
        );
      }

    } finally {
      setStartingTrip(false);
    }
  }


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
          Carregando dados da viagem...
        </Text>
      </SafeAreaView>
    );
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
        <ScreenHeader
          title="Iniciar viagem"
          subtitle={
            canSelectDriver
               ? (
                  'Selecione o motorista e o veículo. ' +
                  'A rota padrão é opcional.'
                )
              : (
                  'Selecione o veículo e informe os dados ' +
                  'atuais da viagem.'
                )
          }
        />


        {canSelectDriver ? (
          <>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Motorista
            </Text>


            {drivers.length === 0 ? (
              <View
                style={
                  styles.warning
                }
              >
                <Text
                  style={
                    styles.warningText
                  }
                >
                  Nenhum motorista ativo
                  está disponível.
                </Text>
              </View>

            ) : (
              drivers.map(
                (driver) => {
                  const selected =
                    selectedDriver?.id ===
                    driver.id;


                  return (
                    <TouchableOpacity
                      key={
                        driver.id
                      }
                      style={[
                        styles.card,

                        selected &&
                          styles.selectedCard,
                      ]}
                      activeOpacity={
                        0.8
                      }
                      onPress={() =>
                        setSelectedDriver(
                          driver,
                        )
                      }
                      disabled={
                        startingTrip
                      }
                    >
                      <View
                        style={
                          styles.cardHeader
                        }
                      >
                        <View
                          style={
                            styles.cardTextArea
                          }
                        >
                          <Text
                            style={
                              styles.cardTitle
                            }
                          >
                            {getDriverName(
                              driver,
                            )}
                          </Text>


                          <Text
                            style={
                              styles.helper
                            }
                          >
                            Usuário:{' '}
                            {driver.username}
                          </Text>
                        </View>


                        {selected && (
                          <Text
                            style={
                              styles.selectedText
                            }
                          >
                            Selecionado
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                },
              )
            )}
          </>
        ) : (
          <View
            style={
              styles.userCard
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
                styles.userName
              }
            >
              {user?.first_name ||
                user?.username ||
                'Usuário'}
            </Text>

            <Text
              style={
                styles.helper
              }
            >
              Esta viagem será vinculada
              à sua conta.
            </Text>
          </View>
        )}


        {canSelectDriver && (
          <>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Rota padrão
        </Text>


        {routes.length === 0 ? (
          <View
            style={
              styles.warning
            }
          >
            <Text
              style={
                styles.warningText
              }
            >
              Nenhuma rota padrão ativa
              está disponível.
            </Text>
          </View>

        ) : (
          routes.map(
            (route) => {
              const selected =
                selectedRoute?.id ===
                route.id;


              return (
                <TouchableOpacity
                  key={
                    route.id
                  }
                  style={[
                    styles.card,

                    selected &&
                      styles.selectedCard,
                  ]}
                  activeOpacity={
                    0.8
                  }
                  onPress={() =>
                    selectRoute(
                      route,
                    )
                  }
                  disabled={
                    startingTrip
                  }
                >
                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {route.name}
                    </Text>


                    {selected && (
                      <Text
                        style={
                          styles.selectedText
                        }
                      >
                        Selecionada
                      </Text>
                    )}
                  </View>


                  <Text
                    style={
                      styles.routeText
                    }
                  >
                    {route.origin}
                    {' → '}
                    {route.destination}
                  </Text>


                  <Text
                    style={
                      styles.helper
                    }
                  >
                    Distância padrão:{' '}

                    {Number(
                      route
                        .expected_distance_km,
                    ).toLocaleString(
                      'pt-BR',
                      {
                        maximumFractionDigits:
                          3,
                      },
                    )}

                    {' km'}
                  </Text>


                  <Text
                    style={
                      styles.helper
                    }
                  >
                    Tolerância:{' '}

                    {Number(
                      route
                        .tolerance_percent,
                    ).toLocaleString(
                      'pt-BR',
                    )}

                    %
                  </Text>
                </TouchableOpacity>
              );
            },
          )
        )}
          </>
        )}


        <Text
          style={
            styles.sectionTitle
          }
        >
          Veículo
        </Text>


        {vehicles.length === 0 ? (
          <View
            style={
              styles.warning
            }
          >
            <Text
              style={
                styles.warningText
              }
            >
              Nenhum veículo ativo
              está disponível.
            </Text>
          </View>

        ) : (
          vehicles.map(
            (vehicle) => {
              const selected =
                selectedVehicle?.id ===
                vehicle.id;


              return (
                <TouchableOpacity
                  key={
                    vehicle.id
                  }
                  style={[
                    styles.card,

                    selected &&
                      styles.selectedCard,
                  ]}
                  activeOpacity={
                    0.8
                  }
                  onPress={() =>
                    setSelectedVehicle(
                      vehicle,
                    )
                  }
                  disabled={
                    startingTrip
                  }
                >
                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {vehicle.plate}
                    </Text>


                    {selected && (
                      <Text
                        style={
                          styles.selectedText
                        }
                      >
                        Selecionado
                      </Text>
                    )}
                  </View>


                  <Text
                    style={
                      styles.routeText
                    }
                  >
                    {vehicle.brand}{' '}
                    {vehicle.model}
                  </Text>


                  <Text
                    style={
                      styles.helper
                    }
                  >
                    KM atual:{' '}

                    {vehicle.current_km
                      .toLocaleString(
                        'pt-BR',
                      )}
                  </Text>
                </TouchableOpacity>
              );
            },
          )
        )}


        <Text
          style={
            styles.sectionTitle
          }
        >
          Dados da viagem
        </Text>


        <Text
          style={
            styles.label
          }
        >
          Origem
        </Text>


        <TextInput
          style={
            styles.input
          }
          value={
            origin
          }
          onChangeText={
            setOrigin
          }
          placeholder="Origem"
          editable={
            !startingTrip
          }
        />


        <Text
          style={
            styles.label
          }
        >
          Destino
        </Text>


        <TextInput
          style={
            styles.input
          }
          value={
            destination
          }
          onChangeText={
            setDestination
          }
          placeholder="Destino"
          editable={
            !startingTrip
          }
        />


        <Text
          style={
            styles.label
          }
        >
          Quilometragem inicial
        </Text>


        <TextInput
          style={
            styles.input
          }
          value={
            startKm
          }
          onChangeText={
            setStartKm
          }
          placeholder="Ex.: 52517"
          keyboardType="numeric"
          editable={
            !startingTrip
          }
        />


        {selectedVehicle && (
          <Text
            style={
              styles.kmHint
            }
          >
            KM atual registrado:{' '}

            {selectedVehicle.current_km
              .toLocaleString(
                'pt-BR',
              )}
          </Text>
        )}


        <View
          style={
            styles.photoBox
          }
        >
          <Text
            style={
              styles.photoTitle
            }
          >
            Comprovante do odômetro
          </Text>


          <Text
            style={
              styles.photoDescription
            }
          >
            Tire uma foto nítida do painel mostrando a quilometragem atual.
          </Text>


          {startOdometerPhoto && (
            <Image
              source={{
                uri:
                  startOdometerPhoto.uri,
              }}
              style={
                styles.odometerPhoto
              }
              resizeMode="cover"
            />
          )}


          <AppButton
            title={
              startOdometerPhoto
                ? 'Tirar outra foto'
                : 'Tirar foto do odômetro'
            }
            onPress={
              takeStartOdometerPhoto
            }
            loading={
              takingPhoto
            }
            disabled={
              startingTrip
            }
          />


          {!canSelectDriver && (
            <Text
              style={
                styles.photoRequired
              }
            >
              Foto obrigatória para iniciar a viagem.
            </Text>
          )}
        </View>


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
            styles.buttonArea
          }
        >
          <AppButton
  title="Iniciar viagem"
  onPress={handleStartTrip}
  loading={startingTrip}
  disabled={
    !selectedVehicle ||
    (
      !canSelectDriver &&
      !startOdometerPhoto
    ) ||
    (
      canSelectDriver &&
      !selectedDriver
    )
  }
/>
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

    userCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 18,
    },

    userName: {
      marginTop: 4,
      color:
        '#263238',
      fontSize: 17,
      fontWeight:
        '600',
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight:
        'bold',
      color:
        '#263238',
      marginTop: 12,
      marginBottom: 12,
    },

    card: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 2,
      borderColor:
        'transparent',
    },

    selectedCard: {
      borderColor:
        '#0D47A1',
      backgroundColor:
        '#F5F9FF',
    },

    cardHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    cardTextArea: {
      flex: 1,
      marginRight: 10,
    },

    cardTitle: {
      flex: 1,
      marginRight: 10,
      fontSize: 17,
      fontWeight:
        'bold',
      color:
        '#263238',
    },

    selectedText: {
      color:
        '#0D47A1',
      fontSize: 12,
      fontWeight:
        '600',
    },

    routeText: {
      marginTop: 7,
      color:
        '#455A64',
      fontWeight:
        '600',
    },

    helper: {
      marginTop: 5,
      color:
        '#78909C',
      fontSize: 12,
    },

    label: {
      marginBottom: 6,
      color:
        '#607D8B',
      fontSize: 13,
      fontWeight:
        '600',
    },

    input: {
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#CFD8DC',
      borderRadius: 10,
      padding: 14,
      marginBottom: 14,
      color:
        '#263238',
    },

    kmHint: {
      marginTop: -6,
      marginBottom: 16,
      color:
        '#78909C',
      fontSize: 12,
    },

    photoBox: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 18,
    },

    photoTitle: {
      color:
        '#263238',
      fontSize: 16,
      fontWeight:
        'bold',
    },

    photoDescription: {
      marginTop: 6,
      marginBottom: 14,
      color:
        '#607D8B',
      lineHeight: 19,
    },

    odometerPhoto: {
      width: '100%',
      height: 210,
      borderRadius: 10,
      marginBottom: 14,
      backgroundColor:
        '#ECEFF1',
    },

    photoRequired: {
      marginTop: 10,
      color:
        '#78909C',
      fontSize: 12,
    },

    warning: {
      backgroundColor:
        '#FFF8E1',
      borderRadius: 10,
      padding: 14,
      marginBottom: 15,
    },

    warningText: {
      color:
        '#795548',
    },

    errorBox: {
      backgroundColor:
        '#FFEBEE',
      borderRadius: 8,
      padding: 12,
      marginBottom: 14,
    },

    errorText: {
      color:
        '#C62828',
    },

    buttonArea: {
      marginTop: 6,
    },
  });